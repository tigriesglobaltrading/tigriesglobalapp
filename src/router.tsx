import { Navigate, createBrowserRouter } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { DashboardLayout } from "./layouts/DashboardLayout";
import { ClientsPage } from "./pages/ClientsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { EquipmentPage } from "./pages/EquipmentPage";
import { InvoiceEditorPage, InvoicesPage } from "./pages/InvoicesPage";
import { LoginPage } from "./pages/LoginPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { SettingsPage } from "./pages/SettingsPage";
import { WorkspacePage } from "./pages/WorkspacePage";

const workspaceRoutes = [
  ["clients", "Clients", "Manage customers and prospects with contacts, VAT numbers, addresses, notes, project history, quotes, invoices, and documents."],
  ["projects", "Projects", "Manage construction sites with client details, address, budget, progress, team, equipment, stock consumption, tasks, documents, photos, and profitability."],
  ["quotes", "Quotes", "Create quotes with line items, labor, materials, tax, discounts, validity dates, PDF export, and invoice conversion."],
  ["invoices", "Invoices", "Manage invoices with numbers, client and project links, payment status, due dates, deposits, reminders, PDF export, and accounting export."],
  ["team", "Team", "Manage employees and internal users with roles, skills, hourly rates, availability, absences, documents, project assignments, work hours, and permissions."],
  ["planning", "Planning", "Schedule employees, equipment, vehicles, machines, deliveries, meetings, absences, and project assignments with day, week, and month views."],
  ["equipment", "Equipment", "Manage reusable assets including tools, machines, vehicles, safety equipment, and heavy machinery with assignments, QR codes, maintenance, tracking, condition, history, and location."],
  ["stock", "Stock", "Manage consumable materials and supplies with quantities, units, minimum levels, suppliers, stock movements, project consumption, and low-stock alerts."],
  ["tasks", "Tasks", "Manage project and internal tasks with status, priority, assigned employee, project links, deadlines, comments, attachments, and validation."],
  ["reports", "Reports", "Generate analytics for profitability, revenue, unpaid invoices, labor costs, equipment usage, stock consumption, maintenance alerts, employee hours, and exports."],
] as const;

export const router = createBrowserRouter([
  {
    path: "/",
    element: <ProtectedRoute />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          ...workspaceRoutes.map(([path, title, description]) => ({
            path,
            element:
              path === "clients" ? (
                <ClientsPage />
              ) : path === "invoices" ? (
                <InvoicesPage />
              ) : path === "equipment" ? (
                <EquipmentPage />
              ) : (
                <WorkspacePage description={description} title={title} />
              ),
          })),
          { path: "invoices/new", element: <InvoiceEditorPage /> },
          { path: "invoices/:invoiceId/edit", element: <InvoiceEditorPage /> },
          { path: "employees", element: <Navigate replace to="/team" /> },
          { path: "inventory", element: <Navigate replace to="/equipment" /> },
          { path: "tools", element: <Navigate replace to="/equipment" /> },
          { path: "machines", element: <Navigate replace to="/equipment" /> },
          { path: "vehicles", element: <Navigate replace to="/equipment" /> },
          { path: "settings", element: <SettingsPage /> },
          { path: "*", element: <NotFoundPage /> },
        ],
      },
    ],
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
]);
