"use client";

import { ABROAD_CITIES, CUSTOM_PLACE_ID, MONGOLIAN_CITIES, PLACE_TIMEZONES } from "@/lib/cities";
import type { CustomPlace } from "@/lib/astrology";

type Props = {
  /** Prefix for element ids when the fields appear more than once on a page. */
  idPrefix?: string;
  cityId: string;
  place: CustomPlace;
  onCity: (cityId: string) => void;
  onPlace: (place: CustomPlace) => void;
};

export const EMPTY_PLACE: CustomPlace = { label: "", latitude: Number.NaN, longitude: Number.NaN, timezone: "Asia/Ulaanbaatar" };

export function PlaceFields({ idPrefix = "", cityId, place, onCity, onPlace }: Props) {
  const custom = cityId === CUSTOM_PLACE_ID;
  const number = (value: string) => (value.trim() === "" ? Number.NaN : Number(value.replace(",", ".")));
  return <>
    <label htmlFor={`${idPrefix}birth-city`}>Төрсөн газар</label>
    <select id={`${idPrefix}birth-city`} name="birthCity" value={cityId} onChange={(event) => onCity(event.target.value)}>
      <optgroup label="Монгол Улс">{MONGOLIAN_CITIES.map((city) => <option value={city.id} key={city.id}>{city.name} · {city.province}</option>)}</optgroup>
      <optgroup label="Гадаад улс">{ABROAD_CITIES.map((city) => <option value={city.id} key={city.id}>{city.name} · {city.province}</option>)}</optgroup>
      <optgroup label="Жагсаалтад байхгүй"><option value={CUSTOM_PLACE_ID}>Өөр газар — координатаар оруулах</option></optgroup>
    </select>
    {!custom && <p className="field-hint">Сум, тосгонд төрсөн бол «Өөр газар»-ыг сонгож координатаа оруулбал Мандах орд илүү нарийн гарна.</p>}
    {custom && <fieldset className="custom-place">
      <legend>Төрсөн газрын координат</legend>
      <label htmlFor={`${idPrefix}place-label`}><span>Газрын нэр (заавал биш)</span><input id={`${idPrefix}place-label`} maxLength={60} value={place.label} onChange={(event) => onPlace({ ...place, label: event.target.value })} placeholder="Жишээ: Хархорин сум" /></label>
      <div className="coordinate-row">
        <label htmlFor={`${idPrefix}place-lat`}><span>Өргөрөг</span><input id={`${idPrefix}place-lat`} inputMode="decimal" value={Number.isNaN(place.latitude) ? "" : String(place.latitude)} onChange={(event) => onPlace({ ...place, latitude: number(event.target.value) })} placeholder="47.92" aria-describedby={`${idPrefix}coordinate-hint`} /></label>
        <label htmlFor={`${idPrefix}place-lon`}><span>Уртраг</span><input id={`${idPrefix}place-lon`} inputMode="decimal" value={Number.isNaN(place.longitude) ? "" : String(place.longitude)} onChange={(event) => onPlace({ ...place, longitude: number(event.target.value) })} placeholder="106.92" aria-describedby={`${idPrefix}coordinate-hint`} /></label>
      </div>
      <p className="field-hint" id={`${idPrefix}coordinate-hint`}>Аравтын бутархайгаар: хойд өргөрөг, зүүн уртраг эерэг; өмнөд, баруун бол хасах тэмдэгтэй. Газрын зургийн апп дээр цэгээ дарж хуулж авна.</p>
      <label htmlFor={`${idPrefix}place-tz`}><span>Цагийн бүс</span><select id={`${idPrefix}place-tz`} value={place.timezone} onChange={(event) => onPlace({ ...place, timezone: event.target.value })}>{PLACE_TIMEZONES.map((zone) => <option key={zone} value={zone}>{zone === "Asia/Hovd" ? "Asia/Hovd (баруун аймгууд)" : zone === "Asia/Choibalsan" ? "Asia/Choibalsan (Дорнод, Сүхбаатар)" : zone}</option>)}</select></label>
    </fieldset>}
  </>;
}
