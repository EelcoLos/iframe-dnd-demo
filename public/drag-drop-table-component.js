/**
 * DragDropTable Web Component
 * Custom element for tables with drag and drop functionality
 */
import './table-row-component.js';

class DragDropTable extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._rows = [];
    this._selectedRow = null;
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
  }

  set rows(value) {
    this._rows = value;
    this.renderRows();
    this.updateTotal();
  }

  get rows() {
    return this._rows;
  }

  render() {
    const title = this.getAttribute('title') || 'Table';
    const canDrop = this.hasAttribute('can-drop');

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
        }

        .container {
          background: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        h2 {
          color: #4f46e5;
          margin-bottom: 20px;
          font-size: 1.5em;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        thead th {
          background: #f1f5f9;
          padding: 12px;
          text-align: left;
          font-weight: 600;
          color: #475569;
          border-bottom: 2px solid #e2e8f0;
          font-size: 14px;
        }

        thead th:not(:first-child) {
          text-align: right;
        }

        tbody {
          display: table-row-group;
        }

        tfoot {
          border-top: 2px solid #e2e8f0;
        }

        tfoot td {
          padding: 12px;
          font-weight: 600;
          color: #0f172a;
          font-size: 1.1em;
        }

        tfoot td:last-child {
          text-align: right;
          color: #4f46e5;
        }

        :host([can-drop]) tbody {
          min-height: 100px;
        }

        .drop-zone {
          border: 2px dashed #cbd5e1;
          border-radius: 8px;
          padding: 20px;
          text-align: center;
          color: #94a3b8;
          margin: 10px 0;
        }

        .drop-zone.drag-over {
          border-color: #8b5cf6;
          background: #faf5ff;
          color: #7c3aed;
        }
      </style>
      <div class="container">
        <h2></h2>
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th>Quantity</th>
              <th>Unit Price</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody id="table-body">
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3">Total:</td>
              <td id="total">$0.00</td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;

    // Safely set title to prevent XSS
    const h2Element = this.shadowRoot.querySelector('h2');
    if (h2Element) {
      h2Element.textContent = title;
    }

    this.renderRows();
  }

  renderRows() {
    const tbody = this.shadowRoot.getElementById('table-body');
    if (!tbody) return;

    tbody.innerHTML = '';
    
    this._rows.forEach((rowData, index) => {
      const row = document.createElement('table-row');
      row.setAttribute('draggable', 'true');
      row.data = rowData;
      tbody.appendChild(row);
    });
  }

  setupEventListeners() {
    this.shadowRoot.addEventListener('row-drag-start', this.handleDragStart.bind(this));
    this.shadowRoot.addEventListener('row-select', this.handleRowSelect.bind(this));

    if (this.hasAttribute('can-drop')) {
      const tbody = this.shadowRoot.getElementById('table-body');
      tbody.addEventListener('dragover', this.handleDragOver.bind(this));
      tbody.addEventListener('drop', this.handleDrop.bind(this));
    }

    // Listen for keyboard events for copy/paste
    document.addEventListener('keydown', this.handleKeyboard.bind(this));
  }

  handleDragStart(e) {
    const rowData = e.detail.data;
    this.dispatchEvent(new CustomEvent('table-drag-start', {
      detail: { data: rowData },
      bubbles: true,
      composed: true
    }));
  }

  handleRowSelect(e) {
    // Clear previous selection
    const rows = this.shadowRoot.querySelectorAll('table-row');
    rows.forEach(r => r.removeAttribute('selected'));
    
    // Select new row
    e.detail.element.setAttribute('selected', '');
    this._selectedRow = e.detail.data;
  }

  handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }

  handleDrop(e) {
    e.preventDefault();
    // The actual drop handling will be managed by the parent coordinator
  }

  handleKeyboard(e) {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'c' && this._selectedRow) {
        e.preventDefault();
        this.copySelectedRow();
      } else if (e.key === 'v' && this.hasAttribute('can-drop')) {
        e.preventDefault();
        this.pasteRow();
      }
    }
  }

  copySelectedRow() {
    if (this._selectedRow) {
      // Store in clipboard
      navigator.clipboard.writeText(JSON.stringify(this._selectedRow));
      
      // Visual feedback
      const rows = this.shadowRoot.querySelectorAll('table-row[selected]');
      rows.forEach(r => r.flash());

      this.dispatchEvent(new CustomEvent('row-copied', {
        detail: { data: this._selectedRow },
        bubbles: true,
        composed: true
      }));
    }
  }

  async pasteRow() {
    try {
      const text = await navigator.clipboard.readText();
      const rowData = JSON.parse(text);
      this.addRow(rowData);

      this.dispatchEvent(new CustomEvent('row-pasted', {
        detail: { data: rowData },
        bubbles: true,
        composed: true
      }));
    } catch (err) {
      console.error('Failed to paste:', err);
    }
  }

  addRow(rowData) {
    this._rows.push(rowData);
    this.renderRows();
    this.updateTotal();
  }

  removeRow(rowData) {
    const index = this._rows.findIndex(r => 
      r.description === rowData.description &&
      r.quantity === rowData.quantity &&
      r.unitPrice === rowData.unitPrice
    );
    if (index !== -1) {
      this._rows.splice(index, 1);
      this.renderRows();
      this.updateTotal();
    }
  }

  updateTotal() {
    const total = this._rows.reduce((sum, row) => sum + (row.amount || 0), 0);
    const totalElement = this.shadowRoot.getElementById('total');
    if (totalElement) {
      totalElement.textContent = `$${total.toFixed(2)}`;
    }
  }
}

// Register the custom element
customElements.define('drag-drop-table', DragDropTable);

export default DragDropTable;
