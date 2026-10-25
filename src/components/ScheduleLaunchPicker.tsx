import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, 
  Clock, 
  Sparkles, 
  Check, 
  AlertCircle, 
  CalendarClock,
  ChevronRight
} from 'lucide-react';
import { 
  formatScheduleDateDisplay, 
  parseDeadlineStringToDate, 
  calculateAutoReminderDate 
} from '../services/scheduleQueueService';

interface ScheduleLaunchPickerProps {
  scheduledIso: string;
  onScheduleChange: (iso: string, display: string) => void;
  accentColor?: 'emerald' | 'amber' | 'blue';
  tenderDeadline?: string;
  type?: 'invitation' | 'reminder';
}

const COMMON_TIME_OPTIONS = [
  { value: '08:00', label: '8:00 AM (Early Launch)' },
  { value: '08:30', label: '8:30 AM (Pre-Site Start)' },
  { value: '09:00', label: '9:00 AM (Morning Launch)' },
  { value: '10:00', label: '10:00 AM' },
  { value: '11:00', label: '11:00 AM' },
  { value: '12:00', label: '12:00 PM (Noon)' },
  { value: '13:00', label: '1:00 PM (Afternoon)' },
  { value: '14:00', label: '2:00 PM' },
  { value: '15:00', label: '3:00 PM' },
  { value: '16:00', label: '4:00 PM' },
  { value: '17:00', label: '5:00 PM (End of Day)' }
];

export const ScheduleLaunchPicker: React.FC<ScheduleLaunchPickerProps> = ({
  scheduledIso,
  onScheduleChange,
  accentColor = 'emerald',
  tenderDeadline,
  type = 'invitation'
}) => {
  // Parse initial date from ISO or default to tomorrow at 8:00 AM (Early Launch)
  const getInitialTargetDate = () => {
    if (scheduledIso && !isNaN(Date.parse(scheduledIso))) {
      return new Date(scheduledIso);
    }
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(8, 0, 0, 0);
    return tomorrow;
  };

  const getInitialTimeStr = () => {
    if (scheduledIso && !isNaN(Date.parse(scheduledIso))) {
      const d = new Date(scheduledIso);
      const h = String(d.getHours()).padStart(2, '0');
      const m = String(d.getMinutes()).padStart(2, '0');
      return `${h}:${m}`;
    }
    return '08:00';
  };

  const [targetDate, setTargetDate] = useState<Date>(getInitialTargetDate);
  const [selectedTimeStr, setSelectedTimeStr] = useState<string>(getInitialTimeStr);
  const [activePreset, setActivePreset] = useState<string>(() => {
    if (scheduledIso && !isNaN(Date.parse(scheduledIso))) {
      const d = new Date(scheduledIso);
      if (d.getHours() === 8 && d.getMinutes() === 0) return 'tomorrow_8am';
      if (d.getHours() === 9 && d.getMinutes() === 0) return 'tomorrow_9am';
      return 'custom';
    }
    return 'tomorrow_8am';
  });

  // Format date input string YYYY-MM-DD
  const dateInputValue = useMemo(() => {
    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');
    const day = String(targetDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, [targetDate]);

  // Sync state up to parent whenever targetDate or time changes
  const emitChange = (d: Date, timeValue: string) => {
    const [h, m] = timeValue.split(':').map((v) => parseInt(v, 10));
    const newDate = new Date(d);
    newDate.setHours(h ?? 8, m ?? 0, 0, 0);
    setTargetDate(newDate);
    setSelectedTimeStr(timeValue);
    onScheduleChange(newDate.toISOString(), formatScheduleDateDisplay(newDate));
  };

  // Min date string for input (today)
  const minDateStr = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // Quick Preset Handlers
  const handleSelectPreset = (presetKey: string) => {
    setActivePreset(presetKey);
    const now = new Date();

    if (presetKey === 'tomorrow_8am') {
      const d = new Date(now);
      d.setDate(d.getDate() + 1);
      emitChange(d, '08:00');
    } else if (presetKey === 'tomorrow_9am') {
      const d = new Date(now);
      d.setDate(d.getDate() + 1);
      emitChange(d, '09:00');
    } else if (presetKey === 'in_2_days_8am') {
      const d = new Date(now);
      d.setDate(d.getDate() + 2);
      emitChange(d, '08:00');
    } else if (presetKey === 'in_2_days') {
      const d = new Date(now);
      d.setDate(d.getDate() + 2);
      emitChange(d, '09:00');
    } else if (presetKey === 'next_monday_8am') {
      const d = new Date(now);
      const day = d.getDay();
      const daysUntilMonday = ((1 + 7 - day) % 7) || 7;
      d.setDate(d.getDate() + daysUntilMonday);
      emitChange(d, '08:00');
    } else if (presetKey === 'next_monday') {
      const d = new Date(now);
      const day = d.getDay();
      const daysUntilMonday = ((1 + 7 - day) % 7) || 7;
      d.setDate(d.getDate() + daysUntilMonday);
      emitChange(d, '09:00');
    } else if (presetKey === '5_days_prior_8am' && tenderDeadline) {
      const auto = calculateAutoReminderDate(tenderDeadline, 5, 8, 0);
      setTargetDate(auto.date);
      setSelectedTimeStr('08:00');
      onScheduleChange(auto.iso, auto.display);
    } else if (presetKey === '3_days_prior_8am' && tenderDeadline) {
      const auto = calculateAutoReminderDate(tenderDeadline, 3, 8, 0);
      setTargetDate(auto.date);
      setSelectedTimeStr('08:00');
      onScheduleChange(auto.iso, auto.display);
    } else if (presetKey === '5_days_prior' && tenderDeadline) {
      const auto = calculateAutoReminderDate(tenderDeadline, 5, 9, 0);
      setTargetDate(auto.date);
      setSelectedTimeStr('09:00');
      onScheduleChange(auto.iso, auto.display);
    } else if (presetKey === '3_days_prior' && tenderDeadline) {
      const auto = calculateAutoReminderDate(tenderDeadline, 3, 9, 0);
      setTargetDate(auto.date);
      setSelectedTimeStr('09:00');
      onScheduleChange(auto.iso, auto.display);
    }
  };

  const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!val) return;
    const [y, m, d] = val.split('-').map((num) => parseInt(num, 10));
    const newD = new Date(y, m - 1, d);
    setActivePreset('custom');
    emitChange(newD, selectedTimeStr);
  };

  const handleTimeSelect = (timeVal: string) => {
    setActivePreset('custom');
    emitChange(targetDate, timeVal);
  };

  // Detailed human-friendly display
  const detailedDateDisplay = useMemo(() => {
    return targetDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }, [targetDate]);

  const timeDisplay = useMemo(() => {
    return targetDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }, [targetDate]);

  // Relative time computation (e.g. "In 18 hours")
  const relativeTimeLabel = useMemo(() => {
    const diffMs = targetDate.getTime() - new Date().getTime();
    if (diffMs <= 0) return 'Immediate / Ready to trigger';
    const hours = Math.round(diffMs / (1000 * 60 * 60));
    if (hours < 24) {
      return `Launches in approx. ${hours} hour${hours === 1 ? '' : 's'}`;
    }
    const days = Math.round(hours / 24);
    return `Launches in approx. ${days} day${days === 1 ? '' : 's'}`;
  }, [targetDate]);

  const isEmerald = accentColor === 'emerald';
  const isAmber = accentColor === 'amber';
  const isBlue = accentColor === 'blue';

  const primaryBadgeClass = isBlue
    ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
    : isAmber
    ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
    : 'bg-emerald-600 text-white border-emerald-600 shadow-2xs';

  return (
    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-4">
      {/* Header / Mode Indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${
            isBlue ? 'bg-blue-100 text-blue-700' : isAmber ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
          }`}>
            <CalendarClock className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800">
              {type === 'invitation' ? 'Schedule Invitation Launch Date & Time' : 'Automated / Custom Reminder Schedule'}
            </h4>
            <p className="text-[11px] text-slate-500">
              Automated background engine will queue and dispatch emails at this exact scheduled time.
            </p>
          </div>
        </div>
        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
          isBlue ? 'bg-blue-50 text-blue-700 border-blue-200' : isAmber ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
        }`}>
          {relativeTimeLabel}
        </span>
      </div>

      {/* Preset Buttons */}
      <div className="space-y-1.5">
        <label className="block text-[11px] font-semibold text-slate-600">
          Quick Launch Presets:
        </label>
        <div className="flex flex-wrap gap-1.5">
          {/* 8:00 AM Early Launch Preset */}
          <button
            type="button"
            onClick={() => handleSelectPreset('tomorrow_8am')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
              activePreset === 'tomorrow_8am'
                ? primaryBadgeClass
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
            }`}
          >
            <Clock className="w-3 h-3" />
            <span>Tomorrow at 8:00 AM (Early Launch)</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectPreset('tomorrow_9am')}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-all cursor-pointer ${
              activePreset === 'tomorrow_9am'
                ? primaryBadgeClass
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
            }`}
          >
            Tomorrow at 9:00 AM
          </button>

          <button
            type="button"
            onClick={() => handleSelectPreset('in_2_days_8am')}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-all cursor-pointer ${
              activePreset === 'in_2_days_8am'
                ? primaryBadgeClass
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
            }`}
          >
            In 2 Days (8:00 AM)
          </button>

          <button
            type="button"
            onClick={() => handleSelectPreset('next_monday_8am')}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-all cursor-pointer ${
              activePreset === 'next_monday_8am'
                ? primaryBadgeClass
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
            }`}
          >
            Next Monday (8:00 AM)
          </button>

          {tenderDeadline && (
            <button
              type="button"
              onClick={() => handleSelectPreset('5_days_prior_8am')}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                activePreset === '5_days_prior_8am'
                  ? primaryBadgeClass
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>5 Days Prior (8:00 AM)</span>
            </button>
          )}

          {tenderDeadline && (
            <button
              type="button"
              onClick={() => handleSelectPreset('3_days_prior_8am')}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                activePreset === '3_days_prior_8am'
                  ? primaryBadgeClass
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>3 Days Prior (8:00 AM)</span>
            </button>
          )}
        </div>
      </div>

      {/* Date & Time Custom Pickers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-200">
        {/* Date Selector */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>Launch Date:</span>
          </label>
          <input
            type="date"
            min={minDateStr}
            value={dateInputValue}
            onChange={handleDateInputChange}
            className="w-full text-xs font-medium px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden"
          />
        </div>

        {/* Time Selector */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>Launch Time:</span>
          </label>
          <div className="flex gap-1.5">
            <select
              value={selectedTimeStr}
              onChange={(e) => handleTimeSelect(e.target.value)}
              className="w-full text-xs font-medium px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden cursor-pointer"
            >
              {COMMON_TIME_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Confirmation Banner */}
      <div className={`p-2.5 rounded-lg border flex items-center justify-between gap-3 text-xs ${
        isBlue
          ? 'bg-blue-50/80 border-blue-200 text-blue-900'
          : isEmerald 
          ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900' 
          : 'bg-amber-50/80 border-amber-200 text-amber-900'
      }`}>
        <div className="flex items-center gap-2">
          <Check className={`w-4 h-4 ${isBlue ? 'text-blue-600' : isEmerald ? 'text-emerald-600' : 'text-amber-600'} shrink-0`} />
          <div>
            <span className="font-semibold">Scheduled Launch:</span>{' '}
            <strong className="font-bold">{detailedDateDisplay} at {timeDisplay}</strong>
          </div>
        </div>
        <span className="text-[10px] font-mono opacity-80 shrink-0">
          Tag: {formatScheduleDateDisplay(targetDate)}
        </span>
      </div>
    </div>
  );
};
