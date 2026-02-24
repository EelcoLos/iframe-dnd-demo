using System.Net;
using System.Reflection;
using System.Text;

namespace DragDropAvaloniaDemo;

/// <summary>
/// Minimal HTTP server that serves the contents of the <c>public/</c> folder
/// and exposes a <c>POST /bridge</c> endpoint so any browser (not only an
/// embedded WebView) can send bridge messages to the native host.
/// </summary>
public class LocalAssetServer
{
    private readonly HttpListener _listener = new();
    private Thread? _thread;

    /// <summary>Raised on the thread-pool when a POST /bridge message arrives.</summary>
    public event Action<string>? BridgeMessage;

    public string BaseUrl { get; }

    private static string PublicRoot =>
        Path.Combine(
            Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location) ?? ".",
            "public");

    /// <summary>
    /// Polyfill injected into every HTML page so that
    /// <c>window.chrome.webview.postMessage</c> falls back to
    /// <c>POST /bridge</c> when the page is not inside an embedded WebView.
    /// </summary>
    private const string BridgePolyfill = """
        <script>
        (function(){
          if(window.chrome&&window.chrome.webview)return;
          window.chrome=window.chrome||{};
          window.chrome.webview={
            postMessage:function(msg){
              fetch('/bridge',{method:'POST',headers:{'Content-Type':'application/json'},body:msg})
                .catch(function(){});
            }
          };
        })();
        </script>
        """;

    public LocalAssetServer(int port = 0)
    {
        if (port == 0) port = FindFreePort();
        BaseUrl = $"http://localhost:{port}";
        _listener.Prefixes.Add(BaseUrl + "/");
    }

    public void Start()
    {
        _listener.Start();
        _thread = new Thread(HandleRequests) { IsBackground = true, Name = "AssetServer" };
        _thread.Start();
    }

    public void Stop() => _listener.Stop();

    private void HandleRequests()
    {
        while (_listener.IsListening)
        {
            HttpListenerContext ctx;
            try { ctx = _listener.GetContext(); }
            catch (HttpListenerException) { break; }
            ThreadPool.QueueUserWorkItem(_ => ServeRequest(ctx));
        }
    }

    private void ServeRequest(HttpListenerContext ctx)
    {
        var req  = ctx.Request;
        var resp = ctx.Response;

        try
        {
            // ── Bridge endpoint ──────────────────────────────────────────────
            if (req.HttpMethod == "POST" &&
                string.Equals(req.Url?.LocalPath, "/bridge", StringComparison.OrdinalIgnoreCase))
            {
                using var reader = new System.IO.StreamReader(req.InputStream, Encoding.UTF8);
                var body = reader.ReadToEnd();
                if (!string.IsNullOrWhiteSpace(body))
                    BridgeMessage?.Invoke(body);

                resp.StatusCode = 204;
                resp.AddHeader("Access-Control-Allow-Origin", "*");
                resp.Close();
                return;
            }

            // ── OPTIONS pre-flight (CORS) ────────────────────────────────────
            if (req.HttpMethod == "OPTIONS")
            {
                resp.StatusCode = 204;
                resp.AddHeader("Access-Control-Allow-Origin", "*");
                resp.AddHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
                resp.AddHeader("Access-Control-Allow-Headers", "Content-Type");
                resp.Close();
                return;
            }

            // ── Static file serving ──────────────────────────────────────────
            var localPath = req.Url?.LocalPath ?? "/";
            if (localPath == "/") localPath = "/parent.html";

            var filePath        = Path.Combine(PublicRoot, localPath.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
            var publicRootFull  = Path.GetFullPath(PublicRoot);
            var fileFullPath    = Path.GetFullPath(filePath);

            if (!IsUnderDirectory(publicRootFull, fileFullPath) || !File.Exists(fileFullPath))
            {
                resp.StatusCode = 404;
                resp.Close();
                return;
            }

            var mimeType = GetMimeType(fileFullPath);
            resp.ContentType = mimeType;
            resp.StatusCode  = 200;
            resp.AddHeader("Access-Control-Allow-Origin", "*");

            if (mimeType.StartsWith("text/html", StringComparison.OrdinalIgnoreCase))
            {
                // Inject the bridge polyfill so pages work in any browser.
                var html  = File.ReadAllText(fileFullPath, Encoding.UTF8);
                var idx   = html.IndexOf("<head>", StringComparison.OrdinalIgnoreCase);
                html = idx >= 0
                    ? html.Insert(idx + "<head>".Length, BridgePolyfill)
                    : BridgePolyfill + html;
                var bytes = Encoding.UTF8.GetBytes(html);
                resp.ContentLength64 = bytes.Length;
                resp.OutputStream.Write(bytes);
            }
            else
            {
                using var fs = File.OpenRead(fileFullPath);
                fs.CopyTo(resp.OutputStream);
            }
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[AssetServer] Error serving {req.Url}: {ex.Message}");
            try { resp.StatusCode = 500; } catch { /* already sent */ }
        }
        finally
        {
            try { resp.Close(); } catch { /* ignore */ }
        }
    }

    private static bool IsUnderDirectory(string baseDirectory, string path)
    {
        var prefix = baseDirectory.EndsWith(Path.DirectorySeparatorChar.ToString(), StringComparison.Ordinal)
            ? baseDirectory
            : baseDirectory + Path.DirectorySeparatorChar;
        return string.Equals(baseDirectory, path, StringComparison.OrdinalIgnoreCase)
            || path.StartsWith(prefix, StringComparison.OrdinalIgnoreCase);
    }

    private static string GetMimeType(string path) =>
        Path.GetExtension(path).ToLowerInvariant() switch
        {
            ".html" => "text/html; charset=utf-8",
            ".js"   => "application/javascript; charset=utf-8",
            ".css"  => "text/css; charset=utf-8",
            ".svg"  => "image/svg+xml",
            ".png"  => "image/png",
            ".jpg" or ".jpeg" => "image/jpeg",
            ".ico"  => "image/x-icon",
            _       => "application/octet-stream",
        };

    private static int FindFreePort()
    {
        var l = new System.Net.Sockets.TcpListener(IPAddress.Loopback, 0);
        l.Start();
        var port = ((IPEndPoint)l.LocalEndpoint).Port;
        l.Stop();
        return port;
    }
}

