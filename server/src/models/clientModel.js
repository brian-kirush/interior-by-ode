// Client model WITHOUT mongoose dependency
// Simple in-memory storage for development

let clients = [];
let currentId = 1;

class Client {
  static async find() {
    return [...clients];
  }

  static async findById(id) {
    return clients.find(c => c.id === parseInt(id)) || null;
  }

  static async findByIdAndUpdate(id, data, options = {}) {
    const index = clients.findIndex(c => c.id === parseInt(id));
    if (index === -1) return null;
    
    clients[index] = { ...clients[index], ...data };
    if (options.new) {
      return clients[index];
    }
    return { ...clients[index] };
  }

  static async findByIdAndDelete(id) {
    const index = clients.findIndex(c => c.id === parseInt(id));
    if (index === -1) return null;
    
    const deleted = clients[index];
    clients.splice(index, 1);
    return deleted;
  }

  constructor(data) {
    this.id = currentId++;
    this.name = data.name || '';
    this.email = data.email || '';
    this.phone = data.phone || '';
    this.address = data.address || '';
    this.company = data.company || '';
    this.notes = data.notes || '';
    this.status = data.status || 'active';
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  async save() {
    clients.push(this);
    return this;
  }
}

module.exports = Client;