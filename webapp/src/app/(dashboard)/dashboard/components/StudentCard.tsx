"use client";

import { useState, useRef, useEffect } from "react";
import type { DashboardStudent } from "@/lib/types";

interface StudentCardProps {
  student: DashboardStudent;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function StudentCard({ student, onClick, onEdit, onDelete }: StudentCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMenu]);

  const handleCardClick = (event: React.MouseEvent) => {
    // Don't trigger navigation if clicking on the menu button or menu
    if ((event.target as HTMLElement).closest('[data-menu]')) {
      return;
    }
    onClick();
  };

  const handleMenuClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    setShowMenu(!showMenu);
  };

  const handleEdit = (event: React.MouseEvent) => {
    event.stopPropagation();
    setShowMenu(false);
    onEdit();
  };

  const handleDelete = (event: React.MouseEvent) => {
    event.stopPropagation();
    setShowMenu(false);
    onDelete();
  };

  const formatLastSession = (dateString?: string) => {
    if (!dateString) return "No sessions yet";

    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return "Yesterday";
    if (diffDays <= 7) return `${diffDays} days ago`;
    if (diffDays <= 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  return (
    <li
      className={`relative rounded-lg border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-300 cursor-pointer transition-all duration-200 ${
        isHovered
          ? "shadow-lg shadow-black/40 border-slate-700 transform translate-y-[-2px]"
          : "hover:border-slate-700"
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-slate-100 truncate flex-1">
          {student.name}
        </h3>
        <div className="flex items-center gap-2 shrink-0">
          <span className="rounded-full border border-slate-800 px-3 py-1 text-xs text-slate-400">
            {student.totalSessions} sessions
          </span>
          {/* Three dots menu button */}
          <div className="relative" data-menu ref={menuRef}>
            <button
              onClick={handleMenuClick}
              className={`p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-all duration-200 ${
                isHovered ? "opacity-100" : "opacity-0"
              }`}
              data-menu
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="currentColor"
                data-menu
              >
                <circle cx="3" cy="8" r="1.5" />
                <circle cx="8" cy="8" r="1.5" />
                <circle cx="13" cy="8" r="1.5" />
              </svg>
            </button>

            {/* Dropdown menu */}
            {showMenu && (
              <div
                className="absolute top-full right-0 mt-1 w-32 rounded-md border border-slate-800 bg-slate-950/95 shadow-xl shadow-black/40 z-10"
                data-menu
              >
                <button
                  onClick={handleEdit}
                  className="w-full px-3 py-2 text-left text-xs text-slate-100 hover:bg-slate-800/60 rounded-t-md transition-colors"
                  data-menu
                >
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  className="w-full px-3 py-2 text-left text-xs text-rose-300 hover:bg-slate-800/60 rounded-b-md transition-colors"
                  data-menu
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <p className="mt-2 text-xs text-slate-500">
        Last session: {formatLastSession(student.lastSessionDate)}
      </p>

      <p className="mt-1 text-xs text-slate-500">
        Added {new Date(student.createdAt).toLocaleDateString()}
      </p>
    </li>
  );
}