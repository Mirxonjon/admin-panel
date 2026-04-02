export class User {
  constructor({ id, name, email, role, status, lastActive }) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.role = role;
    this.status = status;
    this.lastActive = lastActive;
  }
}
