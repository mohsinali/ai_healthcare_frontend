"use client";
import {
  ArrowUpRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  MoreHorizontal,
  Phone,
  PhoneForwarded,
  Plus,
  Save,
  Trash2,
  UserRoundCheck,
  Waves,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { EmptyState, LoadingState } from "@/components/feedback/states";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/auth/auth-provider";
import Link from "next/link";

const metrics = [
  { label: "Total Calls", value: "48", change: "+12%", icon: Phone },
  {
    label: "Appointments Booked",
    value: "17",
    change: "+4 today",
    icon: CalendarDays,
  },
  { label: "Confirmed", value: "14", change: "82% rate", icon: CheckCircle2 },
  {
    label: "Transferred",
    value: "6",
    change: "12.5% of calls",
    icon: PhoneForwarded,
  },
];
const appointments = [
  ["09:00 AM", "Olivia Martin", "General Consultation", "Confirmed"],
  ["10:30 AM", "Noah Williams", "Follow-up Visit", "Pending"],
  ["01:15 PM", "Emma Davis", "New Patient Visit", "Confirmed"],
];
const calls = [
  ["Sarah Wilson", "2m 34s", "Appointment Booked"],
  ["Michael Brown", "4m 12s", "Transferred"],
  ["Unknown Caller", "1m 08s", "FAQ Answered"],
];

export default function Home() {
  const { user } = useAuth();
  if (user?.platformRole === "SUPER_ADMIN")
    return (
      <AppShell>
        <div className="space-y-6">
          <PageHeader
            title="Platform Overview"
            description="Manage organizations and platform access."
          />
          <Card>
            <CardContent className="flex flex-col items-start p-6">
              <div className="rounded-lg bg-accent p-3 text-accent-foreground">
                <Building2 />
              </div>
              <h2 className="mt-4 text-lg font-semibold">Tenant Management</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Create clinic organizations and manage their memberships.
              </p>
              <Button asChild className="mt-4">
                <Link href="/tenants">
                  View Tenants
                  <ArrowUpRight />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    );
  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="Good Morning, Sarah"
          description="Here’s what’s happening at Sunshine Clinic today."
          actions={
            <>
              <Button variant="outline">
                <Download />
                Export
              </Button>
              <Button>
                <Plus />
                Add Appointment
              </Button>
            </>
          }
        />
        <section
          aria-label="Today’s summary"
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          {metrics.map(({ label, value, change, icon: Icon }) => (
            <Card key={label}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight">
                      {value}
                    </p>
                  </div>
                  <div className="rounded-md bg-accent p-2 text-accent-foreground">
                    <Icon className="size-4" />
                  </div>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  <span className="font-medium text-success">{change}</span>{" "}
                  from yesterday
                </p>
              </CardContent>
            </Card>
          ))}
        </section>
        <section className="grid gap-4 xl:grid-cols-[1.65fr_1fr]">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle>Today’s Appointments</CardTitle>
                <CardDescription>
                  Static schedule preview for August 23
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm">
                View All
                <ArrowUpRight />
              </Button>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead className="border-y bg-muted/60 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2.5 font-medium">Time</th>
                    <th className="px-3 py-2.5 font-medium">Patient</th>
                    <th className="px-3 py-2.5 font-medium">Service</th>
                    <th className="px-3 py-2.5 font-medium">Status</th>
                    <th className="w-10">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map(([time, patient, service, status]) => (
                    <tr
                      className="border-b last:border-0 hover:bg-muted/40"
                      key={time}
                    >
                      <td className="px-3 py-3 font-medium">{time}</td>
                      <td className="px-3 py-3">{patient}</td>
                      <td className="px-3 py-3 text-muted-foreground">
                        {service}
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge
                          variant={status === "Pending" ? "warning" : "success"}
                        >
                          {status}
                        </StatusBadge>
                      </td>
                      <td>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Actions for ${patient}`}
                        >
                          <MoreHorizontal />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>AI Front Desk</CardTitle>
              <CardDescription>Voice agent operational status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border bg-muted/40 p-4">
                <div className="flex items-center justify-between">
                  <StatusBadge variant="success">Online</StatusBadge>
                  <Waves className="text-primary" />
                </div>
                <p className="mt-5 text-2xl font-semibold">98.7%</p>
                <p className="text-xs text-muted-foreground">
                  Successful call completion
                </p>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Avg. Response</p>
                  <p className="mt-1 font-semibold">1.4 sec</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Active Since</p>
                  <p className="mt-1 font-semibold">7:00 AM</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
        <section className="grid gap-4 xl:grid-cols-[1.25fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Recent AI Calls</CardTitle>
              <CardDescription>Static conversation outcomes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              {calls.map(([name, duration, outcome]) => (
                <div
                  className="flex items-center gap-3 rounded-md px-2 py-3 hover:bg-muted/50"
                  key={name}
                >
                  <div className="rounded-full bg-accent p-2 text-accent-foreground">
                    <Phone className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{name}</p>
                    <p className="text-xs text-muted-foreground">{outcome}</p>
                  </div>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock3 className="size-3" />
                    {duration}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Foundation Components</CardTitle>
              <CardDescription>
                Forms, actions, and semantic states
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="clinic-name">
                  Clinic Display Name{" "}
                  <span className="text-destructive" aria-label="required">
                    *
                  </span>
                </Label>
                <Input
                  id="clinic-name"
                  defaultValue="Sunshine Clinic"
                  aria-describedby="clinic-help"
                />
                <p id="clinic-help" className="text-xs text-muted-foreground">
                  Shown to team members across the workspace.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button>
                  <Save />
                  Save Changes
                </Button>
                <Button variant="secondary">
                  <UserRoundCheck />
                  Invite Team Member
                </Button>
                <Button variant="destructive">
                  <Trash2 />
                  Delete
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusBadge variant="success">Completed</StatusBadge>
                <StatusBadge variant="warning">Pending</StatusBadge>
                <StatusBadge variant="danger">Failed</StatusBadge>
                <StatusBadge variant="info">Active</StatusBadge>
                <StatusBadge>Offline</StatusBadge>
              </div>
            </CardContent>
          </Card>
        </section>
        <section className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Empty State</CardTitle>
            </CardHeader>
            <EmptyState
              title="No Appointments Yet"
              description="Appointments will appear here once they are created."
              action={
                <Button>
                  <Plus />
                  Add Appointment
                </Button>
              }
            />
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Loading State</CardTitle>
            </CardHeader>
            <LoadingState />
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
