"use client";

import { useId } from "react";

type Props = {
  legend: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

const pad = (value: number) => String(value).padStart(2, "0");
const dayPart = (hour: number) => hour < 6 ? "шөнө" : hour < 12 ? "өглөө" : hour < 18 ? "өдөр" : "орой";

// Two plain 24-hour selects instead of <input type="time">: the native control follows the OS locale,
// and in 12-hour (AM/PM) mode editing the hour of a "12:00 PM" default silently turned 01:30 into 13:30.
export function BirthTimeFields({ legend, value, onChange, disabled }: Props) {
  const id = useId();
  const [hour = "", minute = ""] = value ? value.split(":") : [];
  const update = (nextHour: string, nextMinute: string) => onChange(nextHour || nextMinute ? `${nextHour}:${nextMinute}` : "");
  return <fieldset className="time-fields" disabled={disabled}>
    <legend>{legend}</legend>
    <label htmlFor={`${id}-hour`}><span>Цаг</span><select id={`${id}-hour`} value={hour} required={!disabled} onChange={(event) => update(event.target.value, minute || "00")}><option value="">Цаг</option>{Array.from({ length: 24 }, (_, item) => <option key={item} value={pad(item)}>{pad(item)} цаг · {dayPart(item)}</option>)}</select></label>
    <label htmlFor={`${id}-minute`}><span>Минут</span><select id={`${id}-minute`} value={minute} required={!disabled} onChange={(event) => update(hour, event.target.value)}><option value="">Минут</option>{Array.from({ length: 60 }, (_, item) => <option key={item} value={pad(item)}>{pad(item)} мин</option>)}</select></label>
  </fieldset>;
}
