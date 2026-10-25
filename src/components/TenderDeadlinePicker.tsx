import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  Check, 
  CalendarDays,
  CheckCircle2,
  CalendarCheck
} from 'lucide-react';

interface TenderDeadlinePickerProps {
  value: string;
  onChange: (formattedValue: string) => void;
  accentColor?: 'emerald' | 'amber' | 'blue';
  initialDaysOffset?: number;
}

const STANDARD_TIMES = [
  { value: '5:00 PM', label: '5:00 PM (End of Business)' },
  { value: '11:00 PM', label: '11:00 PM (Night Cutoff)' },
  { value: '11:59 PM', label: '11:59 PM (End of Day)' },
  { value: '12:00 PM', label: '12:00 PM (Noon Cutoff)' },
  { value: '2:00 PM', label: '2:00 PM (Afternoon Cutoff)' },
  { value: 'custom', label: 'Custom Time...' }
];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// Utility to get ordinal suffix
export function getOrdinalSuffix(day: number): string {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

// Format template string: "September 7th - 11:00 PM"
export function formatTenderDeadline(date: Date, timeStr: string): string {
  const month = MONTH_NAMES[date.getMonth()];
  const day = date.getDate();
  const suffix = getOrdinalSuffix(day);
  return `${month} ${day}${suffix} - ${timeStr}`;
}

// Format detailed preview: "Monday, September 7, 2026 — 11:00 PM"
export function formatDetailedDeadline(date: Date, timeStr: string): string {
  const weekday = WEEKDAY_NAMES[date.getDay()];
  const month = MONTH_NAMES[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();
  return `${weekday}, ${month} ${day}, ${year} — ${timeStr}`;
}

// Parse existing string into Date and Time if possible
function parseInitialDeadline(valueStr: string, defaultOffsetDays = 7): { date: Date; time: string } {
  const now = new Date();
  let targetDate = new Date(now);
  targetDate.setDate(now.getDate() + defaultOffsetDays);
  let targetTime = '11:00 PM';

  if (!valueStr || typeof valueStr !== 'string') {
    return { date: targetDate, time: targetTime };
  }

  // Check if string contains " - " splitting date & time (e.g. "September 7th - 11:00 PM")
  const parts = valueStr.split(/\s*-\s*/);
  if (parts.length >= 2) {
    targetTime = parts[1].trim();
  }

  // Attempt to parse month and day
  const datePart = parts[0].trim();
  const match = datePart.match(/([a-zA-Z]+)\s+(\d+)/);
  if (match) {
    const monthIndex = MONTH_NAMES.findIndex(m => m.toLowerCase().startsWith(match[1].toLowerCase().slice(0, 3)));
    const dayNumber = parseInt(match[2], 10);
    if (monthIndex !== -1 && !isNaN(dayNumber)) {
      targetDate = new Date(now.getFullYear(), monthIndex, dayNumber);
      // If the parsed date is before now - 30 days, assume next year
      if (targetDate.getTime() < now.getTime() - 30 * 24 * 60 * 60 * 1000) {
        targetDate.setFullYear(now.getFullYear() + 1);
      }
    }
  }

  return { date: targetDate, time: targetTime };
}

export const TenderDeadlinePicker: React.FC<TenderDeadlinePickerProps> = ({
  value,
  onChange,
  accentColor = 'emerald',
  initialDaysOffset = 7
}) => {
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    return parseInitialDeadline(value, initialDaysOffset).date;
  });
  const [selectedTime, setSelectedTime] = useState<string>(() => {
    return parseInitialDeadline(value, initialDaysOffset).time;
  });
  const [customTimeInput, setCustomTimeInput] = useState<string>('');
  const [isCustomTime, setIsCustomTime] = useState<boolean>(() => {
    const parsed = parseInitialDeadline(value, initialDaysOffset).time;
    return !STANDARD_TIMES.some(t => t.value === parsed);
  });

  // Calendar navigation state (current viewing month/year)
  const [viewDate, setViewDate] = useState<Date>(() => new Date(selectedDate));
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const calendarPopoverRef = useRef<HTMLDivElement>(null);

  // Sync back to parent whenever date or time updates
  const updateDeadline = (newDate: Date, newTime: string) => {
    setSelectedDate(newDate);
    setSelectedTime(newTime);
    const formatted = formatTenderDeadline(newDate, newTime);
    onChange(formatted);
  };

  // Close calendar popover on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarPopoverRef.current && !calendarPopoverRef.current.contains(event.target as Node)) {
        setIsCalendarOpen(false);
      }
    };
    if (isCalendarOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCalendarOpen]);

  // Quick Presets logic
  const handleApplyPreset = (daysOffset?: number, endOfMonth = false) => {
    const now = new Date();
    const newDate = new Date(now);
    
    if (endOfMonth) {
      // Last day of current month
      newDate.setFullYear(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (typeof daysOffset === 'number') {
      newDate.setDate(now.getDate() + daysOffset);
    }

    const defaultTime = '11:00 PM';
    setViewDate(new Date(newDate));
    setIsCustomTime(false);
    updateDeadline(newDate, defaultTime);
  };

  // Month navigation for calendar popover
  const handlePrevMonth = () => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Generate calendar days for current viewDate
  const calendarGrid = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: Array<{
      day: number;
      month: number;
      year: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
      isPast: boolean;
    }> = [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Prev month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      const cellDate = new Date(prevYear, prevMonth, d);
      days.push({
        day: d,
        month: prevMonth,
        year: prevYear,
        isCurrentMonth: false,
        isToday: false,
        isSelected: false,
        isPast: cellDate < today
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const cellDate = new Date(year, month, d);
      const isToday = cellDate.toDateString() === today.toDateString();
      const isSelected = cellDate.toDateString() === selectedDate.toDateString();
      days.push({
        day: d,
        month,
        year,
        isCurrentMonth: true,
        isToday,
        isSelected,
        isPast: cellDate < today
      });
    }

    // Next month padding to make full 35 or 42 grid
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const nextMonth = month === 11 ? 0 : month + 1;
      const nextYear = month === 11 ? year + 1 : year;
      days.push({
        day: i,
        month: nextMonth,
        year: nextYear,
        isCurrentMonth: false,
        isToday: false,
        isSelected: false,
        isPast: false
      });
    }

    return days;
  }, [viewDate, selectedDate]);

  // Styling accents
  const isAmber = accentColor === 'amber';
  const isBlue = accentColor === 'blue';
  const badgeBg = isBlue
    ? 'bg-blue-100 text-blue-900 border-blue-300'
    : isAmber 
    ? 'bg-amber-100 text-amber-900 border-amber-300' 
    : 'bg-emerald-100 text-emerald-900 border-emerald-300';
  const headerIconColor = isBlue ? 'text-blue-600' : isAmber ? 'text-amber-600' : 'text-emerald-600';
  const buttonActiveColor = isBlue
    ? 'bg-blue-600 hover:bg-blue-700 text-white'
    : isAmber 
    ? 'bg-amber-600 hover:bg-amber-700 text-white' 
    : 'bg-emerald-600 hover:bg-emerald-700 text-white';
  const ringFocus = isBlue ? 'focus:ring-blue-500' : isAmber ? 'focus:ring-amber-500' : 'focus:ring-emerald-500';
  const borderFocus = isBlue ? 'focus:border-blue-500' : isAmber ? 'focus:border-amber-500' : 'focus:border-emerald-500';
  const selectedDayStyle = isBlue
    ? 'bg-blue-600 text-white font-bold shadow-sm'
    : isAmber 
    ? 'bg-amber-600 text-white font-bold shadow-sm' 
    : 'bg-emerald-600 text-white font-bold shadow-sm';

  const detailedText = useMemo(() => {
    return formatDetailedDeadline(selectedDate, selectedTime);
  }, [selectedDate, selectedTime]);

  const emailTemplateTag = useMemo(() => {
    return formatTenderDeadline(selectedDate, selectedTime);
  }, [selectedDate, selectedTime]);

  return (
    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 relative">
      {/* 1. Header & Live Calculated Display Field */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <CalendarDays className={`w-4 h-4 ${headerIconColor}`} />
            <span>Tender Submission Deadline</span>
          </label>
          <span className="text-[10px] font-mono text-slate-400">Tag: {`{{Tender Deadline}}`}</span>
        </div>

        {/* Live Display Field */}
        <div className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 ${badgeBg} transition-all`}>
          <div className="flex items-center gap-2 min-w-0">
            <CalendarCheck className="w-4 h-4 shrink-0 text-slate-800" />
            <div className="truncate">
              <span className="text-xs font-extrabold text-slate-900 tracking-tight block truncate">
                {detailedText}
              </span>
              <span className="text-[10px] text-slate-600 font-medium block truncate">
                Interpolated Email Value: <strong className="text-slate-900 font-mono">{emailTemplateTag}</strong>
              </span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/80 text-slate-800 shadow-2xs shrink-0 border border-slate-200/50">
            Live
          </span>
        </div>
      </div>

      {/* 2. Split Date & Time Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 relative" ref={calendarPopoverRef}>
        {/* Date Control with Popover trigger */}
        <div className="space-y-1 relative">
          <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
            Target Date
          </label>
          
          <div className="relative">
            <button
              type="button"
              id="tender-deadline-date-trigger"
              onClick={() => {
                setViewDate(new Date(selectedDate));
                setIsCalendarOpen(!isCalendarOpen);
              }}
              className={`w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs focus:outline-none focus:ring-2 ${ringFocus}`}
            >
              <span className="flex items-center gap-2 truncate">
                <CalendarIcon className={`w-3.5 h-3.5 ${headerIconColor} shrink-0`} />
                <span className="truncate">
                  {MONTH_NAMES[selectedDate.getMonth()]} {selectedDate.getDate()}, {selectedDate.getFullYear()}
                </span>
              </span>
              <span className="text-[10px] font-normal text-slate-400 ml-1 shrink-0">Change ▾</span>
            </button>

            {/* Interactive Calendar Popover Grid */}
            {isCalendarOpen && (
              <div className="absolute top-full left-0 z-30 mt-1.5 w-72 bg-white rounded-xl shadow-xl border border-slate-200 p-3 animate-in fade-in zoom-in-95 duration-100">
                {/* Month/Year Header */}
                <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-slate-100">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <span className="text-xs font-extrabold text-slate-800">
                    {MONTH_NAMES[viewDate.getMonth()]} {viewDate.getFullYear()}
                  </span>

                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Day of Week Headers */}
                <div className="grid grid-cols-7 gap-1 text-center mb-1">
                  {DAY_LABELS.map(dayLabel => (
                    <span key={dayLabel} className="text-[10px] font-bold text-slate-400 uppercase py-0.5">
                      {dayLabel}
                    </span>
                  ))}
                </div>

                {/* Day Matrix */}
                <div className="grid grid-cols-7 gap-1 text-center">
                  {calendarGrid.map((item, idx) => {
                    const isCurrent = item.isCurrentMonth;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          const newD = new Date(item.year, item.month, item.day);
                          updateDeadline(newD, selectedTime);
                          setIsCalendarOpen(false);
                        }}
                        className={`w-8 h-8 rounded-lg text-xs flex items-center justify-center transition-all cursor-pointer mx-auto ${
                          item.isSelected
                            ? selectedDayStyle
                            : item.isToday
                            ? 'border border-slate-900 font-bold text-slate-900 bg-slate-100'
                            : isCurrent
                            ? 'text-slate-800 hover:bg-slate-100'
                            : 'text-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {item.day}
                      </button>
                    );
                  })}
                </div>

                {/* Today Quick Link in popover */}
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <button
                    type="button"
                    onClick={() => {
                      const today = new Date();
                      setViewDate(new Date(today));
                      updateDeadline(today, selectedTime);
                      setIsCalendarOpen(false);
                    }}
                    className="font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                  >
                    Select Today
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCalendarOpen(false)}
                    className="font-bold text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Time Dropdown Selector */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
            Cutoff Time
          </label>

          <div className="relative">
            <select
              value={isCustomTime ? 'custom' : selectedTime}
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'custom') {
                  setIsCustomTime(true);
                } else {
                  setIsCustomTime(false);
                  updateDeadline(selectedDate, val);
                }
              }}
              className={`w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 ${ringFocus} shadow-2xs cursor-pointer`}
            >
              {STANDARD_TIMES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Custom Time Entry Input when "custom" is active */}
          {isCustomTime && (
            <div className="pt-1 animate-in fade-in duration-150 flex items-center gap-1.5">
              <input
                type="text"
                placeholder="e.g. 4:30 PM, 9:00 AM"
                value={customTimeInput || selectedTime}
                onChange={(e) => {
                  const typed = e.target.value;
                  setCustomTimeInput(typed);
                  updateDeadline(selectedDate, typed);
                }}
                className={`w-full px-2.5 py-1 text-xs font-bold bg-white border border-slate-300 rounded text-slate-900 focus:outline-none focus:ring-1 ${ringFocus}`}
              />
            </div>
          )}
        </div>
      </div>

      {/* 3. Expanded Quick Presets Toolbar */}
      <div className="pt-1 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>Quick Presets (Sets 11:00 PM Cutoff)</span>
          </span>
        </div>

        <div className="grid grid-cols-5 gap-1.5">
          <button
            type="button"
            onClick={() => handleApplyPreset(3)}
            className="px-2 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-extrabold text-slate-700 transition-all cursor-pointer shadow-2xs hover:border-slate-300 text-center truncate"
            title="+3 Days from today at 11:00 PM"
          >
            +3 Days
          </button>
          <button
            type="button"
            onClick={() => handleApplyPreset(5)}
            className="px-2 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-extrabold text-slate-700 transition-all cursor-pointer shadow-2xs hover:border-slate-300 text-center truncate"
            title="+5 Days from today at 11:00 PM"
          >
            +5 Days
          </button>
          <button
            type="button"
            onClick={() => handleApplyPreset(7)}
            className="px-2 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-extrabold text-slate-700 transition-all cursor-pointer shadow-2xs hover:border-slate-300 text-center truncate"
            title="+1 Week from today at 11:00 PM"
          >
            +1 Week
          </button>
          <button
            type="button"
            onClick={() => handleApplyPreset(14)}
            className="px-2 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-extrabold text-slate-700 transition-all cursor-pointer shadow-2xs hover:border-slate-300 text-center truncate"
            title="+2 Weeks from today at 11:00 PM"
          >
            +2 Weeks
          </button>
          <button
            type="button"
            onClick={() => handleApplyPreset(undefined, true)}
            className="px-2 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-extrabold text-slate-700 transition-all cursor-pointer shadow-2xs hover:border-slate-300 text-center truncate"
            title="End of current month at 11:00 PM"
          >
            End of Mo.
          </button>
        </div>
      </div>
    </div>
  );
};
