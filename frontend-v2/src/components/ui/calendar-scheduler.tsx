"use client";
import * as React from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ro } from "date-fns/locale";

export interface CalendarSchedulerProps {
  timeSlots?: string[];
  onConfirm?: (value: { date?: Date; time?: string }) => void;
}

export function CalendarScheduler({
  timeSlots = [
    "08:00", "09:00", "10:00", "11:00", "12:00", "13:00",
    "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00"
  ],
  onConfirm,
}: CalendarSchedulerProps) {
  const [date, setDate] = React.useState<Date | undefined>(new Date());
  const [time, setTime] = React.useState<string | undefined>();

  const handleConfirm = () => {
    if (!date || !time) return;
    // Format date to YYYY-MM-DD for URL
    const isoDate = format(date, "yyyy-MM-dd");
    // Navigate to the reservation grid with date pre-selected
    window.location.href = `/rezerva?date=${isoDate}`;
    onConfirm?.({ date, time });
  };

  return (
    <Card className="max-w-sm w-full mx-auto bg-slate-900/80 backdrop-blur-md border-slate-700">
      <CardHeader>
        <CardTitle className="text-white text-center">📅 Alege Data</CardTitle>
        {date && (
          <p className="text-center text-lime-400 font-medium text-sm mt-1">
            {format(date, "eeee, d MMMM yyyy", { locale: ro })}
          </p>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          disabled={{ before: new Date() }}
          className="mx-auto"
        />

        {date && (
          <div>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Interval orar preferat (opțional)</p>
            <div className="grid grid-cols-4 gap-1.5">
              {timeSlots.map((slot) => (
                <button
                  key={slot}
                  onClick={() => setTime(prev => prev === slot ? undefined : slot)}
                  className={cn(
                    "text-xs px-2 py-1.5 rounded-lg font-medium border transition-all",
                    time === slot
                      ? "bg-lime-500 text-slate-950 border-lime-500 font-bold"
                      : "border-slate-700 text-slate-300 hover:border-lime-500 hover:text-lime-400"
                  )}
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          onClick={handleConfirm}
          disabled={!date}
        >
          {date ? `Rezervă pentru ${format(date, "d MMM", { locale: ro })}` : "Alege o dată"}
        </Button>
      </CardFooter>
    </Card>
  );
}
