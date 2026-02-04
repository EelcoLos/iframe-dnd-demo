/**
 * TableRow Web Component
 * Custom element for draggable table rows
 */
class TableRow extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._data = {};
    this._isDragging = false;
  }

  static get observedAttributes() {
    return ['description', 'quantity', 'unit-price', 'amount', 'selected', 'draggable'];
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.render();
    }
  }

  set data(value) {
    this._data = value;
    this.setAttribute('description', value.description || '');
    this.setAttribute('quantity', value.quantity || '');
    this.setAttribute('unit-price', value.unitPrice || '');
    this.setAttribute('amount', value.amount || '');
  }

  get data() {
    return {
      description: this.getAttribute('description') || '',
      quantity: parseFloat(this.getAttribute('quantity')) || 0,
      unitPrice: parseFloat(this.getAttribute('unit-price')) || 0,
      amount: parseFloat(this.getAttribute('amount')) || 0
    };
  }

  render() {
    const description = this.getAttribute('description') || '';
    const quantity = this.getAttribute('quantity') || '';
    const unitPrice = this.getAttribute('unit-price') || '';
    const amount = this.getAttribute('amount') || '';
    const isSelected = this.hasAttribute('selected');
    const isDraggable = this.hasAttribute('draggable');

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: table-row;
          transition: all 0.2s ease;
        }

        :host(:hover) {
          background: #f8fafc;
        }

        :host([draggable="true"]) {
          cursor: move;
          -webkit-user-select: none;
          user-select: none;
        }

        :host([selected]) {
          background: #dbeafe;
          outline: 2px solid #3b82f6;
          outline-offset: -2px;
        }

        :host(.dragging) {
          opacity: 0.5;
        }

        :host(.copied) {
          animation: copiedFlash 0.5s ease;
        }

        @keyframes copiedFlash {
          0%, 100% { background: transparent; }
          50% { background: #86efac; }
        }

        td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #e2e8f0;
        }

        td:first-child {
          font-weight: 500;
          color: #1e293b;
        }

        td:not(:first-child) {
          color: #64748b;
          text-align: right;
        }

        .amount {
          font-weight: 600;
          color: #0f172a;
        }
      </style>
      <td>${description}</td>
      <td>${quantity}</td>
      <td>$${parseFloat(unitPrice).toFixed(2)}</td>
      <td class="amount">$${parseFloat(amount).toFixed(2)}</td>
    `;
  }

  setupEventListeners() {
    if (this.hasAttribute('draggable')) {
      this.addEventListener('pointerdown', this.handlePointerDown.bind(this));
      this.addEventListener('click', this.handleClick.bind(this));
    }
  }

  handlePointerDown(e) {
    this._isDragging = false;
    const startX = e.clientX;
    const startY = e.clientY;

    const handlePointerMove = (e) => {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        this._isDragging = true;
        this.dispatchEvent(new CustomEvent('row-drag-start', {
          detail: { data: this.data, element: this },
          bubbles: true,
          composed: true
        }));
        document.removeEventListener('pointermove', handlePointerMove);
      }
    };

    const handlePointerUp = () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  }

  handleClick(e) {
    if (!this._isDragging) {
      this.dispatchEvent(new CustomEvent('row-select', {
        detail: { data: this.data, element: this },
        bubbles: true,
        composed: true
      }));
    }
  }

  flash() {
    this.classList.add('copied');
    setTimeout(() => this.classList.remove('copied'), 500);
  }
}

// Register the custom element
customElements.define('table-row', TableRow);

export default TableRow;
