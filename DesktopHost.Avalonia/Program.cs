using Avalonia;
using Avalonia.WebView.Desktop;

namespace DragDropAvaloniaDemo;

class Program
{
    [STAThread]
    public static void Main(string[] args)
    {
        // On Linux, disable webkit compositing and sandboxing so the GTK WebView
        // works under WSLg and X11-forwarded sessions without requiring a GPU.
        if (OperatingSystem.IsLinux())
        {
            Environment.SetEnvironmentVariable("WEBKIT_DISABLE_COMPOSITING_MODE", "1");
            Environment.SetEnvironmentVariable("WEBKIT_DISABLE_SANDBOX_THIS_IS_DANGEROUS", "1");
            Environment.SetEnvironmentVariable("LIBGL_ALWAYS_SOFTWARE", "1");
        }

        BuildAvaloniaApp().StartWithClassicDesktopLifetime(args);
    }

    public static AppBuilder BuildAvaloniaApp()
        => AppBuilder.Configure<App>()
            .UsePlatformDetect()
            .WithInterFont()
            .LogToTrace()
            .UseDesktopWebView();
}
