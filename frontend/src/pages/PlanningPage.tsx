import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Filter,
  ListTodo,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  UserPlus,
  UsersRound,
  Video,
  X,
} from "lucide-react";
import { type CSSProperties, FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

type CalendarView = "day" | "week" | "month";
type CalendarFilter = "all" | "event" | "meeting" | "task";
type ScheduleType =
  | "work"
  | "delivery"
  | "meeting"
  | "maintenance"
  | "absence"
  | "reservation";
type ScheduleStatus =
  | "planned"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled";

type Schedule = {
  id: string;
  company_id: string;
  title: string;
  start_datetime: string;
  end_datetime: string;
  type: ScheduleType;
  status: ScheduleStatus;
  notes: string | null;
};

type EventMeta = {
  description: string;
  participants: string;
};

type ScheduleForm = {
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  category: CalendarFilter;
  type: ScheduleType;
  status: ScheduleStatus;
  participants: string;
  description: string;
};

const dayStartHour = 8;
const dayEndHour = 18;
const hourSlots = Array.from(
  { length: dayEndHour - dayStartHour + 1 },
  (_, index) => dayStartHour + index
);

const tabConfig: Array<{
  icon: typeof CalendarDays;
  label: string;
  value: CalendarFilter;
}> = [
  { icon: CalendarDays, label: "All Scheduled", value: "all" },
  { icon: UsersRound, label: "Events", value: "event" },
  { icon: Video, label: "Meetings", value: "meeting" },
  { icon: ListTodo, label: "Task Reminders", value: "task" },
];

const typeLabels: Record<ScheduleType, string> = {
  absence: "Absence",
  delivery: "Delivery",
  maintenance: "Maintenance",
  meeting: "Meeting",
  reservation: "Reservation",
  work: "Work",
};

const statusLabels: Record<ScheduleStatus, string> = {
  cancelled: "Cancelled",
  completed: "Completed",
  confirmed: "Confirmed",
  in_progress: "In progress",
  planned: "Planned",
};

const defaultForm: ScheduleForm = {
  category: "event",
  date: toDateInput(new Date()),
  description: "",
  end_time: "09:00",
  participants: "",
  start_time: "08:00",
  status: "planned",
  title: "",
  type: "work",
};

export function PlanningPage() {
  const { session } = useAuth();
  const companyId = session?.user.id ?? "";
  const [events, setEvents] = useState<Schedule[]>([]);
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>("week");
  const [activeFilter, setActiveFilter] = useState<CalendarFilter>("all");
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | ScheduleStatus>("all");
  const [form, setForm] = useState<ScheduleForm>(defaultForm);
  const [editingEvent, setEditingEvent] = useState<Schedule | null>(null);
  const [previewEvent, setPreviewEvent] = useState<Schedule | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const visibleDays = useMemo(() => getVisibleDays(anchorDate, view), [anchorDate, view]);
  const rangeLabel = useMemo(() => formatRange(visibleDays), [visibleDays]);
  const filteredEvents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return events.filter((event) => {
      const meta = parseNotes(event.notes);
      const category = categoryForType(event.type);
      const matchesTab = activeFilter === "all" || category === activeFilter;
      const matchesStatus = statusFilter === "all" || event.status === statusFilter;
      const matchesSearch =
        !normalizedQuery ||
        [event.title, meta.description, meta.participants, typeLabels[event.type]]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(normalizedQuery));

      return matchesTab && matchesStatus && matchesSearch;
    });
  }, [activeFilter, events, query, statusFilter]);

  const visibleEvents = useMemo(
    () =>
      filteredEvents.filter((event) =>
        visibleDays.some((day) => isSameDay(new Date(event.start_datetime), day))
      ),
    [filteredEvents, visibleDays]
  );

  const loadEvents = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const from = startOfDay(visibleDays[0]).toISOString();
    const to = endOfDay(visibleDays[visibleDays.length - 1]).toISOString();
    const { data, error: loadError } = await supabase
      .from("schedules")
      .select("id, company_id, title, start_datetime, end_datetime, type, status, notes")
      .eq("company_id", companyId)
      .gte("start_datetime", from)
      .lte("start_datetime", to)
      .order("start_datetime");

    if (loadError) {
      setError(loadError.message);
    } else {
      setEvents((data ?? []) as Schedule[]);
    }

    setIsLoading(false);
  }, [companyId, visibleDays]);

  useEffect(() => {
    if (!companyId) {
      return;
    }

    void loadEvents();
  }, [companyId, loadEvents]);

  function movePeriod(direction: "next" | "previous") {
    const amount = direction === "next" ? 1 : -1;

    if (view === "day") {
      setAnchorDate(addDays(anchorDate, amount));
    } else if (view === "week") {
      setAnchorDate(addDays(anchorDate, amount * 7));
    } else {
      setAnchorDate(addMonths(anchorDate, amount));
    }
  }

  function goToday() {
    setAnchorDate(new Date());
  }

  function openCreateModal(date = visibleDays[0], hour = dayStartHour) {
    setEditingEvent(null);
    setPreviewEvent(null);
    setForm({
      ...defaultForm,
      date: toDateInput(date),
      end_time: `${String(Math.min(hour + 1, dayEndHour)).padStart(2, "0")}:00`,
      start_time: `${String(hour).padStart(2, "0")}:00`,
    });
    setIsModalOpen(true);
  }

  function openEditModal(event: Schedule) {
    const start = new Date(event.start_datetime);
    const end = new Date(event.end_datetime);
    const meta = parseNotes(event.notes);

    setEditingEvent(event);
    setPreviewEvent(null);
    setForm({
      category: categoryForType(event.type),
      date: toDateInput(start),
      description: meta.description,
      end_time: toTimeInput(end),
      participants: meta.participants,
      start_time: toTimeInput(start),
      status: event.status,
      title: event.title,
      type: event.type,
    });
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingEvent(null);
    setError(null);
  }

  async function saveEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const start = fromDateAndTime(form.date, form.start_time);
    const end = fromDateAndTime(form.date, form.end_time);

    if (end <= start) {
      setError("End time must be after start time.");
      return;
    }

    const payload = {
      company_id: companyId,
      end_datetime: end.toISOString(),
      notes: buildNotes({
        description: form.description,
        participants: form.participants,
      }),
      start_datetime: start.toISOString(),
      status: form.status,
      title: form.title,
      type: typeForCategory(form.category, form.type),
    };

    const response = editingEvent
      ? await supabase
          .from("schedules")
          .update(payload)
          .eq("id", editingEvent.id)
          .eq("company_id", companyId)
      : await supabase.from("schedules").insert(payload);

    if (response.error) {
      setError(response.error.message);
      return;
    }

    setAnchorDate(new Date(form.date));
    closeModal();
    setMessage(editingEvent ? "Event updated." : "Event created.");
    await loadEvents();
  }

  async function deleteEvent(event: Schedule) {
    const { error: deleteError } = await supabase
      .from("schedules")
      .delete()
      .eq("id", event.id)
      .eq("company_id", companyId);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setPreviewEvent(null);
    closeModal();
    setMessage("Event deleted.");
    await loadEvents();
  }

  return (
    <section className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Dashboard / Calendar</p>
          <h1>Calendar</h1>
          <p>Stay Organized and On Track with Your Personalized Calendar</p>
        </div>
        <div className="page-header-actions">
          <div className="calendar-avatar-stack" aria-label="Calendar participants">
            {["AL", "NM", "SP", "KD"].map((initials) => (
              <span key={initials}>{initials}</span>
            ))}
            <em>+20</em>
          </div>
          <Button type="button" variant="outline">
            <UserPlus aria-hidden="true" />
            Invite
          </Button>
        </div>
      </header>

      {error ? <p className="form-error">{error}</p> : null}
      {message ? <p className="form-success">{message}</p> : null}
      {isLoading ? <p className="muted-text">Loading calendar...</p> : null}

      <Card className="calendar-card">
        <CardContent>
          <div className="calendar-toolbar">
            <div className="calendar-tabs">
              {tabConfig.map((tab) => {
                const Icon = tab.icon;

                return (
                  <button
                    className={activeFilter === tab.value ? "active" : ""}
                    key={tab.value}
                    onClick={() => setActiveFilter(tab.value)}
                    type="button"
                  >
                    <Icon aria-hidden="true" size={15} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
            <div className="calendar-actions">
              <label className="calendar-search">
                <Search aria-hidden="true" size={15} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search"
                />
              </label>
              <Button type="button" variant="outline" onClick={() => setShowFilters((value) => !value)}>
                <Filter aria-hidden="true" />
                Filter
              </Button>
              <Button size="icon" type="button" variant="outline">
                <MoreHorizontal aria-hidden="true" />
              </Button>
              <Button type="button" onClick={() => openCreateModal()}>
                <Plus aria-hidden="true" />
                New
              </Button>
            </div>
          </div>

          {showFilters ? (
            <div className="calendar-filter-panel">
              <label>
                Status
                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as "all" | ScheduleStatus)
                  }
                >
                  <option value="all">All statuses</option>
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}

          <div className="calendar-control-bar">
            <div>
              <strong>{formatMonth(anchorDate)}</strong>
              <Button type="button" variant="outline" onClick={goToday}>
                Today
              </Button>
            </div>
            <div className="calendar-view-toggle">
              {(["day", "week", "month"] as const).map((item) => (
                <button
                  className={view === item ? "active" : ""}
                  key={item}
                  onClick={() => setView(item)}
                  type="button"
                >
                  {capitalize(item)}
                </button>
              ))}
            </div>
            <div className="calendar-date-range">
              <button type="button" onClick={() => setShowDatePicker((value) => !value)}>
                <CalendarDays aria-hidden="true" size={15} />
                {rangeLabel}
              </button>
              {showDatePicker ? (
                <input
                  type="date"
                  value={toDateInput(anchorDate)}
                  onChange={(event) => {
                    setAnchorDate(new Date(event.target.value));
                    setShowDatePicker(false);
                  }}
                />
              ) : null}
            </div>
          </div>

          <div className="calendar-nav-row">
            <Button size="icon" type="button" variant="outline" onClick={() => movePeriod("previous")}>
              <ChevronLeft aria-hidden="true" />
            </Button>
            <Button size="icon" type="button" variant="outline" onClick={() => movePeriod("next")}>
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>

          {view === "month" ? (
            <CalendarMonthView
              anchorDate={anchorDate}
              events={filteredEvents}
              onCreate={openCreateModal}
              onEventClick={setPreviewEvent}
            />
          ) : (
            <CalendarTimeGrid
              events={visibleEvents}
              onCreate={openCreateModal}
              onEventClick={setPreviewEvent}
              view={view}
              visibleDays={visibleDays}
            />
          )}
        </CardContent>
      </Card>

      {isModalOpen ? (
        <PlanningEventModal
          event={editingEvent}
          form={form}
          onChange={setForm}
          onClose={closeModal}
          onDelete={editingEvent ? () => void deleteEvent(editingEvent) : undefined}
          onSubmit={saveEvent}
        />
      ) : null}

      {previewEvent ? (
        <CalendarEventPreview
          event={previewEvent}
          onClose={() => setPreviewEvent(null)}
          onDelete={() => void deleteEvent(previewEvent)}
          onEdit={() => openEditModal(previewEvent)}
        />
      ) : null}
    </section>
  );
}

function CalendarTimeGrid({
  events,
  onCreate,
  onEventClick,
  view,
  visibleDays,
}: {
  events: Schedule[];
  onCreate: (date: Date, hour: number) => void;
  onEventClick: (event: Schedule) => void;
  view: CalendarView;
  visibleDays: Date[];
}) {
  const isTodayVisible = visibleDays.some((day) => isSameDay(day, new Date()));
  const now = new Date();
  const nowTop = ((now.getHours() + now.getMinutes() / 60 - dayStartHour) / (dayEndHour - dayStartHour + 1)) * 100;

  return (
    <div className={cn("calendar-time-grid-wrap", view === "day" && "calendar-time-grid-day")}>
      <div className="calendar-day-headers" style={{ "--calendar-days": visibleDays.length } as CSSProperties}>
        <span />
        {visibleDays.map((day) => (
          <strong className={isSameDay(day, new Date()) ? "today" : ""} key={day.toISOString()}>
            <small>{formatWeekday(day)}</small>
            {day.getDate()}
          </strong>
        ))}
      </div>

      <div className="calendar-time-grid" style={{ "--calendar-days": visibleDays.length } as CSSProperties}>
        <div className="calendar-time-gutter">
          {hourSlots.map((hour) => (
            <span key={hour}>{formatHour(hour)}</span>
          ))}
        </div>
        <div className="calendar-grid-area">
          {visibleDays.map((day, dayIndex) =>
            hourSlots.map((hour) => (
              <button
                aria-label={`Create event ${toDateInput(day)} ${formatHour(hour)}`}
                className="calendar-slot"
                key={`${day.toISOString()}-${hour}`}
                onClick={() => onCreate(day, hour)}
                style={{
                  gridColumn: dayIndex + 1,
                  gridRow: hour - dayStartHour + 1,
                }}
                type="button"
              />
            ))
          )}

          {isTodayVisible && nowTop >= 0 && nowTop <= 100 ? (
            <div className="calendar-now-line" style={{ top: `${nowTop}%` }}>
              <span>{formatCurrentTime(now)}</span>
            </div>
          ) : null}

          {events.map((event) => {
            const start = new Date(event.start_datetime);
            const end = new Date(event.end_datetime);
            const dayIndex = visibleDays.findIndex((day) => isSameDay(day, start));
            const startHour = start.getHours() + start.getMinutes() / 60;
            const duration = Math.max((end.getTime() - start.getTime()) / 3600000, 0.5);

            if (dayIndex < 0) {
              return null;
            }

            return (
              <button
                className={`calendar-event-block calendar-event-${categoryForType(event.type)}`}
                key={event.id}
                onClick={() => onEventClick(event)}
                style={{
                  "--event-day-index": dayIndex,
                  height: `${duration * 68 - 6}px`,
                  top: `${(startHour - dayStartHour) * 68 + 4}px`,
                } as CSSProperties}
                type="button"
              >
                <span>{formatEventRange(start, end)}</span>
                <strong>{event.title}</strong>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CalendarMonthView({
  anchorDate,
  events,
  onCreate,
  onEventClick,
}: {
  anchorDate: Date;
  events: Schedule[];
  onCreate: (date: Date) => void;
  onEventClick: (event: Schedule) => void;
}) {
  const days = buildMonthGrid(anchorDate);

  return (
    <div className="calendar-month-view">
      <div className="calendar-month-weekdays">
        {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="calendar-month-cells">
        {days.map((day) => {
          const dayEvents = events.filter((event) =>
            isSameDay(new Date(event.start_datetime), day)
          );

          return (
            <button
              className={cn(
                "calendar-month-cell",
                day.getMonth() !== anchorDate.getMonth() && "muted",
                isSameDay(day, new Date()) && "today"
              )}
              key={day.toISOString()}
              onClick={() => onCreate(day)}
              type="button"
            >
              <span>{day.getDate()}</span>
              {dayEvents.slice(0, 3).map((event) => (
                <small
                  className={`calendar-month-event calendar-event-${categoryForType(event.type)}`}
                  key={event.id}
                  onClick={(clickEvent) => {
                    clickEvent.stopPropagation();
                    onEventClick(event);
                  }}
                >
                  {event.title}
                </small>
              ))}
              {dayEvents.length > 3 ? <em>+{dayEvents.length - 3}</em> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PlanningEventModal({
  event,
  form,
  onChange,
  onClose,
  onDelete,
  onSubmit,
}: {
  event: Schedule | null;
  form: ScheduleForm;
  onChange: (next: ScheduleForm) => void;
  onClose: () => void;
  onDelete?: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div className="planning-modal-backdrop" onClick={onClose}>
      <form className="planning-modal" onClick={(event) => event.stopPropagation()} onSubmit={onSubmit}>
        <header>
          <div>
            <span>{event ? "Edit event" : "New event"}</span>
            <strong>{event ? event.title : "Schedule an event"}</strong>
          </div>
          <button className="icon-button" onClick={onClose} title="Close" type="button">
            <X aria-hidden="true" size={18} />
          </button>
        </header>

        <div className="planning-modal-grid">
          <label className="planning-field planning-field-wide">
            <Label htmlFor="planning-title">Title</Label>
            <Input
              id="planning-title"
              required
              value={form.title}
              onChange={(inputEvent) => onChange({ ...form, title: inputEvent.target.value })}
              placeholder="Client Presentation Preparation"
            />
          </label>
          <label className="planning-field">
            <Label htmlFor="planning-category">Category</Label>
            <select
              id="planning-category"
              value={form.category}
              onChange={(inputEvent) =>
                onChange({
                  ...form,
                  category: inputEvent.target.value as CalendarFilter,
                  type: typeForCategory(inputEvent.target.value as CalendarFilter, form.type),
                })
              }
            >
              <option value="event">Event</option>
              <option value="meeting">Meeting</option>
              <option value="task">Task reminder</option>
            </select>
          </label>
          <label className="planning-field">
            <Label htmlFor="planning-type">Type</Label>
            <select
              id="planning-type"
              value={form.type}
              onChange={(inputEvent) =>
                onChange({ ...form, type: inputEvent.target.value as ScheduleType })
              }
            >
              {Object.entries(typeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="planning-field">
            <Label htmlFor="planning-date">Day</Label>
            <Input
              id="planning-date"
              required
              type="date"
              value={form.date}
              onChange={(inputEvent) => onChange({ ...form, date: inputEvent.target.value })}
            />
          </label>
          <label className="planning-field">
            <Label htmlFor="planning-start">Start</Label>
            <Input
              id="planning-start"
              required
              type="time"
              value={form.start_time}
              onChange={(inputEvent) => onChange({ ...form, start_time: inputEvent.target.value })}
            />
          </label>
          <label className="planning-field">
            <Label htmlFor="planning-end">End</Label>
            <Input
              id="planning-end"
              required
              type="time"
              value={form.end_time}
              onChange={(inputEvent) => onChange({ ...form, end_time: inputEvent.target.value })}
            />
          </label>
          <label className="planning-field">
            <Label htmlFor="planning-status">Status</Label>
            <select
              id="planning-status"
              value={form.status}
              onChange={(inputEvent) =>
                onChange({ ...form, status: inputEvent.target.value as ScheduleStatus })
              }
            >
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="planning-field planning-field-wide">
            <Label htmlFor="planning-participants">Participants</Label>
            <Input
              id="planning-participants"
              value={form.participants}
              onChange={(inputEvent) => onChange({ ...form, participants: inputEvent.target.value })}
              placeholder="Nora, Adam, Client team"
            />
          </label>
          <label className="planning-field planning-field-wide">
            <Label htmlFor="planning-description">Description</Label>
            <textarea
              id="planning-description"
              value={form.description}
              onChange={(inputEvent) => onChange({ ...form, description: inputEvent.target.value })}
              placeholder="Resources, site access, delivery instructions..."
            />
          </label>
        </div>

        <footer>
          {onDelete ? (
            <Button onClick={onDelete} type="button" variant="outline">
              <Trash2 aria-hidden="true" />
              Delete
            </Button>
          ) : <span />}
          <div>
            <Button onClick={onClose} type="button" variant="outline">
              Cancel
            </Button>
            <Button type="submit">{event ? "Save changes" : "Create event"}</Button>
          </div>
        </footer>
      </form>
    </div>
  );
}

function CalendarEventPreview({
  event,
  onClose,
  onDelete,
  onEdit,
}: {
  event: Schedule;
  onClose: () => void;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const start = new Date(event.start_datetime);
  const end = new Date(event.end_datetime);
  const meta = parseNotes(event.notes);

  useEffect(() => {
    function closeOnEscape(keyboardEvent: KeyboardEvent) {
      if (keyboardEvent.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div className="planning-modal-backdrop" onClick={onClose}>
      <aside className="calendar-event-preview" onClick={(clickEvent) => clickEvent.stopPropagation()}>
        <header>
          <div>
            <span>{typeLabels[event.type]}</span>
            <strong>{event.title}</strong>
          </div>
          <button className="icon-button" onClick={onClose} title="Close" type="button">
            <X aria-hidden="true" size={18} />
          </button>
        </header>
        <div className="calendar-preview-meta">
          <Badge variant="outline">{formatEventRange(start, end)}</Badge>
          <Badge variant="secondary">{statusLabels[event.status]}</Badge>
        </div>
        <section>
          <span>Participants</span>
          <p>{meta.participants || "No participants added."}</p>
        </section>
        <section>
          <span>Description</span>
          <p>{meta.description || "No description added."}</p>
        </section>
        <footer>
          <Button onClick={onDelete} type="button" variant="outline">
            <Trash2 aria-hidden="true" />
            Delete
          </Button>
          <Button onClick={onEdit} type="button">Edit</Button>
        </footer>
      </aside>
    </div>
  );
}

function getVisibleDays(anchorDate: Date, view: CalendarView) {
  if (view === "day") {
    return [anchorDate];
  }

  if (view === "month") {
    return buildMonthGrid(anchorDate);
  }

  const start = startOfWeekMonday(anchorDate);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

function buildMonthGrid(date: Date) {
  const monthStart = startOfMonth(date);
  const first = startOfWeekMonday(monthStart);
  return Array.from({ length: 42 }, (_, index) => addDays(first, index));
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function addDays(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
}

function startOfWeekMonday(date: Date) {
  const next = new Date(date);
  const day = next.getDay() || 7;
  next.setDate(next.getDate() - day + 1);
  next.setHours(0, 0, 0, 0);
  return next;
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function isSameDay(left: Date, right: Date) {
  return toDateInput(left) === toDateInput(right);
}

function toDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function toTimeInput(date: Date) {
  return date.toTimeString().slice(0, 5);
}

function fromDateAndTime(date: string, time: string) {
  return new Date(`${date}T${time}:00`);
}

function formatMonth(date: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatRange(days: Date[]) {
  const first = days[0];
  const last = days[days.length - 1];
  const firstText = new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
  }).format(first);
  const lastText = new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(last);
  return `${firstText} - ${lastText}`;
}

function formatWeekday(date: Date) {
  return new Intl.DateTimeFormat("en", { weekday: "short" }).format(date).toUpperCase();
}

function formatHour(hour: number) {
  const suffix = hour >= 12 ? "PM" : "AM";
  const normalized = hour % 12 || 12;
  return `${normalized} ${suffix}`;
}

function formatCurrentTime(date: Date) {
  const suffix = date.getHours() >= 12 ? "PM" : "AM";
  const hours = date.getHours() % 12 || 12;
  return `${hours}.${String(date.getMinutes()).padStart(2, "0")} ${suffix}`;
}

function formatEventRange(start: Date, end: Date) {
  return `${formatHourLabel(start)} - ${formatHourLabel(end)}`;
}

function formatHourLabel(date: Date) {
  const suffix = date.getHours() >= 12 ? "PM" : "AM";
  const hours = date.getHours() % 12 || 12;
  const minutes = date.getMinutes();
  return minutes ? `${hours}.${String(minutes).padStart(2, "0")} ${suffix}` : `${hours} ${suffix}`;
}

function capitalize(value: string) {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}

function categoryForType(type: ScheduleType): CalendarFilter {
  if (type === "meeting") return "meeting";
  if (type === "reservation" || type === "absence") return "task";
  return "event";
}

function typeForCategory(category: CalendarFilter, fallback: ScheduleType): ScheduleType {
  if (category === "meeting") return "meeting";
  if (category === "task") return "reservation";
  if (category === "event" && fallback === "meeting") return "work";
  return fallback;
}

function parseNotes(notes: string | null): EventMeta {
  if (!notes) {
    return { description: "", participants: "" };
  }

  try {
    const parsed = JSON.parse(notes) as Partial<EventMeta>;
    return {
      description: parsed.description ?? "",
      participants: parsed.participants ?? "",
    };
  } catch {
    return { description: notes, participants: "" };
  }
}

function buildNotes(meta: EventMeta) {
  return JSON.stringify(meta);
}
