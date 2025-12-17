// app/server.ts
import express from "express";
import path from "path";

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// In-memory data (for lab only)
type Role = "admin" | "user";

interface User {
  id: string;
  name: string;
  role: Role;
}

interface AuditLog {
  id: string;
  timestamp: string;
  actorUserId: string;
  targetUserId: string;
  action: "delete";
}

let users: User[] = [
  { id: "1", name: "Alice Admin", role: "admin" },
  { id: "2", name: "Bob User", role: "user" },
  { id: "3", name: "Charlie User", role: "user" },
];

let auditLogs: AuditLog[] = [];

// Simple "auth" via headers
function getCurrentUser(req: express.Request): User | null {
  const userId = req.header("x-user-id");
  const role = req.header("x-user-role") as Role | undefined;
  if (!userId || !role) return null;
  return { id: userId, name: "Header User", role };
}

// Serve a super simple UI at /
app.get("/", (_req, res) => {
  res.send(`
    <!doctype html>
    <html>
      <head>
        <title>User Management</title>
        <meta charset="utf-8" />
        <style>
          body { font-family: sans-serif; margin: 2rem; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #ccc; padding: 0.5rem; text-align: left; }
          button { padding: 0.25rem 0.5rem; }
          .error { color: red; margin-top: 1rem; }
        </style>
      </head>
      <body>
        <h1>User Management</h1>
        <p id="current-role"></p>
        <table id="users-table">
          <thead>
            <tr>
              <th>ID</th><th>Name</th><th>Role</th><th>Actions</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
        <p class="error" id="error"></p>

        <script>
          const ROLE_KEY = "demo-role";
          const ID_KEY = "demo-id";

          function getRole() {
            return localStorage.getItem(ROLE_KEY) || "admin";
          }
          function getId() {
            return localStorage.getItem(ID_KEY) || "1";
          }
          function setRole(role) {
            localStorage.setItem(ROLE_KEY, role);
          }
          function setId(id) {
            localStorage.setItem(ID_KEY, id);
          }

          async function fetchUsers() {
            const res = await fetch("/users");
            const data = await res.json();
            const tbody = document.querySelector("#users-table tbody");
            tbody.innerHTML = "";
            data.forEach(user => {
              const tr = document.createElement("tr");
              tr.innerHTML = \`
                <td>\${user.id}</td>
                <td>\${user.name}</td>
                <td>\${user.role}</td>
                <td>
                  <button data-id="\${user.id}" class="delete-btn">Delete</button>
                </td>
              \`;
              tbody.appendChild(tr);
            });

            document.querySelectorAll(".delete-btn").forEach(btn => {
              btn.addEventListener("click", async (e) => {
                const id = e.target.getAttribute("data-id");
                await deleteUser(id);
                await fetchUsers();
              });
            });
          }

          async function deleteUser(id) {
            const errorEl = document.getElementById("error");
            errorEl.textContent = "";
            const res = await fetch("/users/" + id, {
              method: "DELETE",
              headers: {
                "x-user-id": getId(),
                "x-user-role": getRole()
              }
            });
            if (!res.ok) {
              const text = await res.text();
              errorEl.textContent = text || ("Error " + res.status);
            }
          }

          function renderCurrentRole() {
            const role = getRole();
            const id = getId();
            const el = document.getElementById("current-role");
            el.textContent = "Current user: " + id + " (" + role + ")";
          }

          // For demo, allow toggling between admin/user from console:
          // localStorage.setItem('demo-role', 'user')

          renderCurrentRole();
          fetchUsers();
        </script>
      </body>
    </html>
  `);
});

// API: list users
app.get("/users", (_req, res) => {
  res.json(users);
});

// API: create user (for seeding / tests)
app.post("/users", (req, res) => {
  const { name, role } = req.body as Partial<User>;
  if (!name || (role !== "admin" && role !== "user")) {
    return res.status(400).send("Invalid user");
  }
  const id = String(Date.now());
  const user: User = { id, name, role };
  users.push(user);
  res.status(201).json(user);
});

// API: delete user
app.delete("/users/:id", (req, res) => {
  const currentUser = getCurrentUser(req);
  if (!currentUser) {
    return res.status(401).send("Missing x-user-id or x-user-role");
  }
  if (currentUser.role !== "admin") {
    return res.status(403).send("Only admins can delete users");
  }

  const targetId = req.params.id;
  const existing = users.find(u => u.id === targetId);
  if (!existing) {
    return res.status(404).send("User not found");
  }

  users = users.filter(u => u.id !== targetId);

  const log: AuditLog = {
    id: String(Date.now()),
    timestamp: new Date().toISOString(),
    actorUserId: currentUser.id,
    targetUserId: targetId,
    action: "delete"
  };
  auditLogs.push(log);

  res.status(204).send();
});

// API: audit logs
app.get("/audit-logs", (_req, res) => {
  res.json(auditLogs);
});

// Reset endpoint (nice for tests)
app.post("/reset", (_req, res) => {
  users = [
    { id: "1", name: "Alice Admin", role: "admin" },
    { id: "2", name: "Bob User", role: "user" },
    { id: "3", name: "Charlie User", role: "user" },
  ];
  auditLogs = [];
  res.status(200).send("reset");
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Server running on http://localhost:${port}`);
});