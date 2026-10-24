"use client";

import { BirthDateFields } from "@/components/birth-date-fields";
import { BirthTimeFields } from "@/components/birth-time-fields";
import { PlaceFields } from "@/components/natal/place-fields";
import type { CustomPlace, NatalInput } from "@/lib/astrology";

export type PersonForm = Omit<NatalInput, "place" | "email"> & { place: CustomPlace };

type Props = { id: "a" | "b"; legend: string; nameLabel: string; value: PersonForm; onChange: (value: PersonForm) => void };

export function PersonFields({ id, legend, nameLabel, value, onChange }: Props) {
  const change = <K extends keyof PersonForm>(key: K, next: PersonForm[K]) => onChange({ ...value, [key]: next });
  return <fieldset className={`couple-person person-${id}`}>
    <legend><span className="person-dot" aria-hidden="true" />{legend}</legend>
    <label htmlFor={`${id}-name`}>{nameLabel}</label>
    <input id={`${id}-name`} name={`${id}-name`} autoComplete={id === "a" ? "given-name" : "off"} required maxLength={80} value={value.name} onChange={(event) => change("name", event.target.value)} placeholder="Нэрээ оруулна уу…" />
    <BirthDateFields legend="Төрсөн огноо" value={value.birthDate} onChange={(next) => change("birthDate", next)} />
    <div className="time-row">
      <BirthTimeFields legend="Төрсөн цаг (24 цагаар)" value={value.birthTime} disabled={value.unknownTime} onChange={(next) => change("birthTime", next)} />
      <label className="check-label"><input type="checkbox" checked={value.unknownTime} onChange={(event) => change("unknownTime", event.target.checked)} /><span>Төрсөн цагаа мэдэхгүй</span></label>
    </div>
    <PlaceFields idPrefix={`${id}-`} cityId={value.cityId} place={value.place} onCity={(cityId) => change("cityId", cityId)} onPlace={(place) => change("place", place)} />
  </fieldset>;
}
