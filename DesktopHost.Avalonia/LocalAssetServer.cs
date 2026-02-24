using System.Net;
using System.Reflection;

namespace DragDropAvaloniaDemo;

/// <summary>
/// Minimal HTTP server that serves the contents of the <c>public/</c> folder
/// (copied to the output directory at build time) on a loopback address.
/// This allows embedded WebViews to load same-origin assets via <c>http://localhost</c>
/// rather than <c>file://</c>, which avoids browser security restrictions.
/// </summary>
public class LocalAssetServer
{
    private readonly HttpListener _listener = new();
    private Thread? _thread;

    public string BaseUrl { get; }

    /// <summary>
    /// Resolves the <c>public/</c> directory relative to the executing assembly.
    /// </summary>
    private static string PublicRoot =>
        Path.Combine(
            Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location) ?? ".",
            "public");

    public LocalAssetServer(int port = 0)
    {
        // port 0 → pick a free port
        if (port == 0)
            port = FindFreePort();

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
            try
            {
                ctx = _listener.GetContext();
            }
            catch (HttpListenerException)
            {
                break; // Listener stopped
            }

            ThreadPool.QueueUserWorkItem(_ => ServeRequest(ctx));
        }
    }

    private void ServeRequest(HttpListenerContext ctx)
    {
        var req = ctx.Request;
        var resp = ctx.Response;

        try
        {
            var localPath = req.Url?.LocalPath ?? "/";
            if (localPath == "/") localPath = "/parent.html";

            var filePath = Path.Combine(PublicRoot, localPath.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
            var publicRootFullPath = Path.GetFullPath(PublicRoot);
            var fileFullPath = Path.GetFullPath(filePath);

            // Ensure the resolved path stays within the public root to prevent directory traversal.
            if (!IsUnderDirectory(publicRootFullPath, fileFullPath))
            {
                resp.StatusCode = 404;
                resp.Close();
                return;
            }

            if (!File.Exists(fileFullPath))
            {
                resp.StatusCode = 404;
                resp.Close();
                return;
            }

            resp.ContentType = GetMimeType(fileFullPath);
            resp.StatusCode = 200;

            using var fs = File.OpenRead(fileFullPath);
            fs.CopyTo(resp.OutputStream);
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[AssetServer] Error serving {req.Url}: {ex.Message}");
            resp.StatusCode = 500;
        }
        finally
        {
            resp.Close();
        }
    }

    private static bool IsUnderDirectory(string baseDirectory, string path)
    {
        var baseFullPath = Path.GetFullPath(baseDirectory);
        var targetFullPath = Path.GetFullPath(path);

        if (string.Equals(baseFullPath, targetFullPath, StringComparison.OrdinalIgnoreCase))
            return true;

        var prefix = baseFullPath.EndsWith(Path.DirectorySeparatorChar.ToString(), StringComparison.Ordinal)
            ? baseFullPath
            : baseFullPath + Path.DirectorySeparatorChar;

        return targetFullPath.StartsWith(prefix, StringComparison.OrdinalIgnoreCase);
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
        var listener = new System.Net.Sockets.TcpListener(IPAddress.Loopback, 0);
        listener.Start();
        var port = ((IPEndPoint)listener.LocalEndpoint).Port;
        listener.Stop();
        return port;
    }
}
