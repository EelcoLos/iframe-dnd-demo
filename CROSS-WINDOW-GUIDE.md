# Cross-Window Drag & Drop - User Guide

## How It Works

The Cross-Window Mode allows you to drag items between separate browser windows. Here's the complete workflow:

### Step-by-Step Instructions

1. **Access the Demo**
   - Navigate to `http://localhost:5173/iframe-dnd-demo/` (or the deployed URL)
   - You'll see the main demo page with three tabs

2. **Open Cross-Window Mode**
   - Click the "Cross-Window Mode" tab (the third tab)
   - This will open a new window called the "Coordinator"

3. **Open the Windows**
   - In the Coordinator window, click "📦 Open Draggable Items Window"
     - A new window will open with draggable items
   - Then click "🎯 Open Drop Zones Window"  
     - Another new window will open with drop zones

4. **Arrange Your Windows**
   - You should now have 3 windows open:
     - Coordinator (shows status)
     - Draggable Items (has colored items to drag)
     - Drop Zones (has three zones: To Do, In Progress, Done)
   - Arrange them side-by-side on your screen

5. **Drag and Drop**
   - Click and hold on any item in the Draggable Items window
   - Drag your mouse over to the Drop Zones window
   - The drop zone will highlight when you hover over it
   - Release the mouse to drop the item

### Important Notes

- **Pop-up Blocker**: Make sure your browser allows pop-ups for this site
- **All Windows Must Stay Open**: Don't close any of the windows during drag operations
- **Firefox/Edge**: The system automatically uses postMessage if BroadcastChannel is blocked

### Troubleshooting

**Items won't drag:**
- Check browser console for errors
- Make sure all 3 windows are open
- Try refreshing all windows

**Windows won't open:**
- Check if pop-ups are blocked
- Look for a blocked pop-up icon in the address bar
- Allow pop-ups for this site

**Drop doesn't work:**
- Make sure you're dragging FROM Draggable Items window
- Make sure you're dropping INTO Drop Zones window  
- The zone should highlight blue when hovering

### Technical Details

The cross-window communication uses:
- **BroadcastChannel API** on Chrome/Safari (when not partitioned)
- **window.postMessage** relay on Firefox/Edge (automatic fallback)
- The Coordinator window acts as a message relay between child windows
