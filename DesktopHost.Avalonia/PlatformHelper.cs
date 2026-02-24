using System.Diagnostics;

namespace DragDropAvaloniaDemo;

/// <summary>
/// Cross-platform helpers for browser launch and WSL detection.
/// </summary>
internal static class PlatformHelper
{
    /// <summary>
    /// True when running inside Windows Subsystem for Linux (WSLg or WSL1/2).
    /// </summary>
    public static readonly bool IsWsl =
        OperatingSystem.IsLinux() &&
        File.Exists("/proc/version") &&
        File.ReadAllText("/proc/version").Contains("microsoft", StringComparison.OrdinalIgnoreCase);

    /// <summary>
    /// Opens <paramref name="url"/> in the best available browser for the
    /// current platform (Windows browser when running under WSL).
    /// </summary>
    public static void OpenInBrowser(string url)
    {
        try
        {
            if (IsWsl)
            {
                // Try wslview first (wslu package), then fall back to cmd.exe
                if (!TryStart("wslview", url))
                    TryStart("cmd.exe", $"/c start {url}");
            }
            else
            {
                Process.Start(new ProcessStartInfo(url) { UseShellExecute = true });
            }
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[PlatformHelper] Failed to open browser: {ex.Message}");
        }
    }

    private static bool TryStart(string file, string args)
    {
        try
        {
            var p = Process.Start(new ProcessStartInfo(file, args) { UseShellExecute = false });
            return p != null;
        }
        catch { return false; }
    }
}
