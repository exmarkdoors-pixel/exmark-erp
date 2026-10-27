'use client';

import React, { useState } from 'react';
import {
  BellRing,
  Clock,
  Phone,
  CheckSquare,
  Square,
} from 'lucide-react';
import { FollowUpReminder } from '@/types/erp';

interface FollowUpRemindersProps {
  initialReminders: FollowUpReminder[];
}

export default function FollowUpReminders({ initialReminders }: FollowUpRemindersProps) {
  const [reminders, setReminders] = useState<FollowUpReminder[]>(initialReminders);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending');

  const toggleComplete = (id: string) => {
    setReminders((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isCompleted: !item.isCompleted } : item
      )
    );
  };

  const filteredList = reminders.filter((item) => {
    if (filter === 'pending') return !item.isCompleted;
    if (filter === 'completed') return item.isCompleted;
    return true;
  });

  const pendingCount = reminders.filter((r) => !r.isCompleted).length;

  const getPriorityBadge = (priority: FollowUpReminder['priority']) => {
    switch (priority) {
      case 'Urgent':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-500/15 text-red-500 border border-red-500/30">
            Urgent
          </span>
        );
      case 'High':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/15 text-amber-500 border border-amber-500/30">
            High
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-500/15 text-blue-500 border border-blue-500/30">
            Normal
          </span>
        );
    }
  };

  return (
    <div className="bg-white dark:bg-[#0B132B] rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-red-600/10 text-red-500">
            <BellRing className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Follow-up & Dealer Reminders
              {pendingCount > 0 && (
                <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-red-600 text-white">
                  {pendingCount} Pending
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Quotes, site measurements & dealer payment schedules
            </p>
          </div>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900/80 p-1 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setFilter('pending')}
            className={`px-2.5 py-1 rounded transition-colors ${
              filter === 'pending'
                ? 'bg-red-600 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-2.5 py-1 rounded transition-colors ${
              filter === 'all'
                ? 'bg-red-600 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            All ({reminders.length})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-2.5 py-1 rounded transition-colors ${
              filter === 'completed'
                ? 'bg-red-600 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Done
          </button>
        </div>
      </div>

      {/* Reminders List */}
      <div className="space-y-3">
        {filteredList.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-900/40 rounded-lg">
            No reminders in this view.
          </div>
        ) : (
          filteredList.map((item) => (
            <div
              key={item.id}
              className={`p-3 rounded-lg border transition-all ${
                item.isCompleted
                  ? 'bg-slate-50/60 dark:bg-slate-900/30 border-slate-200/50 dark:border-slate-800/50 opacity-60'
                  : 'bg-white dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Complete Checkbox */}
                <button
                  onClick={() => toggleComplete(item.id)}
                  aria-label={item.isCompleted ? `Mark ${item.client} reminder pending` : `Mark ${item.client} reminder completed`}
                  className="mt-1 text-slate-400 hover:text-red-500 transition-colors flex-shrink-0"
                >
                  {item.isCompleted ? (
                    <CheckSquare className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <Square className="w-5 h-5" />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-bold ${
                          item.isCompleted
                            ? 'line-through text-slate-400'
                            : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {item.client}
                      </span>
                      <span className="text-[10px] text-slate-400 px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800">
                        {item.district}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {getPriorityBadge(item.priority)}
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                        <Clock className="w-3 h-3 text-red-400" />
                        {item.dueDate}
                      </span>
                    </div>
                  </div>

                  <p
                    className={`text-xs mb-2 ${
                      item.isCompleted
                        ? 'line-through text-slate-400'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {item.purpose}
                  </p>

                  {/* Actions & Contact Info */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="font-medium text-slate-700 dark:text-slate-300 truncate">
                      {item.contactPerson} • {item.phone}
                    </span>

                    <div className="flex items-center gap-2">
                      {item.estimatedValue && (
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          Est: {item.estimatedValue}
                        </span>
                      )}
                      <a
                        href={`tel:${item.phone}`}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium transition-colors"
                      >
                        <Phone className="w-3 h-3 text-red-500" />
                        Call
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
