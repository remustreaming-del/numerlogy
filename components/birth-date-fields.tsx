"use client";

import { useId, useState } from "react";

type Props = {
  legend: string;
  value: string;
  onChange: (value: string) => void;
  minYear?: number;
  maxYear?: number;
  required?: boolean;
};

const daysInMonth = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();

export function BirthDateFields({ legend, value, onChange, minYear = 1900, maxYear = new Date().getFullYear(), required = true }: Props) {
  const id = useId();
  const [parts, setParts] = useState(() => {
    const [year = "", month = "", day = ""] = value ? value.split("-") : [];
    return { year, month, day };
  });
  const dayCount = parts.year && parts.month ? daysInMonth(Number(parts.year), Number(parts.month)) : 31;
  const update = (part: keyof typeof parts, next: string) => {
    const changed = { ...parts, [part]: next };
    if (changed.year && changed.month && changed.day) changed.day = String(Math.min(Number(changed.day), daysInMonth(Number(changed.year), Number(changed.month)))).padStart(2, "0");
    setParts(changed);
    onChange(changed.year && changed.month && changed.day ? `${changed.year}-${changed.month}-${changed.day}` : "");
  };
  return <fieldset className="date-fields">
    <legend>{legend}</legend>
    <label htmlFor={`${id}-year`}><span>Он</span><select id={`${id}-year`} name={`${id}-year`} value={parts.year} required={required} onChange={(event) => update("year", event.target.value)}><option value="">Он</option>{Array.from({ length: maxYear - minYear + 1 }, (_, index) => maxYear - index).map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
    <label htmlFor={`${id}-month`}><span>Сар</span><select id={`${id}-month`} name={`${id}-month`} value={parts.month} required={required} onChange={(event) => update("month", event.target.value)}><option value="">Сар</option>{Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0")).map((item) => <option key={item} value={item}>{Number(item)}</option>)}</select></label>
    <label htmlFor={`${id}-day`}><span>Өдөр</span><select id={`${id}-day`} name={`${id}-day`} value={parts.day} required={required} onChange={(event) => update("day", event.target.value)}><option value="">Өдөр</option>{Array.from({ length: dayCount }, (_, index) => String(index + 1).padStart(2, "0")).map((item) => <option key={item} value={item}>{Number(item)}</option>)}</select></label>
  </fieldset>;
}
