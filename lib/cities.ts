export type BirthCity = {
  id: string;
  name: string;
  province: string;
  latitude: number;
  longitude: number;
  timezone: "Asia/Ulaanbaatar" | "Asia/Hovd" | "Asia/Choibalsan";
};

// Local, deliberately small catalogue. Coordinates are city centres; no lookup
// request is made when a visitor selects a birthplace.
export const MONGOLIAN_CITIES: BirthCity[] = [
  { id: "ulaanbaatar", name: "Улаанбаатар", province: "Нийслэл", latitude: 47.9185, longitude: 106.9177, timezone: "Asia/Ulaanbaatar" },
  { id: "erdenet", name: "Эрдэнэт", province: "Орхон", latitude: 49.0278, longitude: 104.0444, timezone: "Asia/Ulaanbaatar" },
  { id: "darkhan", name: "Дархан", province: "Дархан-Уул", latitude: 49.4867, longitude: 105.9228, timezone: "Asia/Ulaanbaatar" },
  { id: "choibalsan", name: "Чойбалсан", province: "Дорнод", latitude: 48.0726, longitude: 114.5326, timezone: "Asia/Choibalsan" },
  { id: "hovd", name: "Ховд", province: "Ховд", latitude: 48.0056, longitude: 91.6419, timezone: "Asia/Hovd" },
  { id: "ulgii", name: "Өлгий", province: "Баян-Өлгий", latitude: 48.9683, longitude: 89.9625, timezone: "Asia/Hovd" },
  { id: "ulaangom", name: "Улаангом", province: "Увс", latitude: 49.9811, longitude: 92.0667, timezone: "Asia/Hovd" },
  { id: "murun", name: "Мөрөн", province: "Хөвсгөл", latitude: 49.6342, longitude: 100.1625, timezone: "Asia/Ulaanbaatar" },
  { id: "tsetserleg", name: "Цэцэрлэг", province: "Архангай", latitude: 47.4769, longitude: 101.4503, timezone: "Asia/Ulaanbaatar" },
  { id: "bulgan", name: "Булган", province: "Булган", latitude: 48.8125, longitude: 103.5347, timezone: "Asia/Ulaanbaatar" },
  { id: "zuunmod", name: "Зуунмод", province: "Төв", latitude: 47.7069, longitude: 106.9528, timezone: "Asia/Ulaanbaatar" },
  { id: "mandalgovi", name: "Мандалговь", province: "Дундговь", latitude: 45.7625, longitude: 106.2708, timezone: "Asia/Ulaanbaatar" },
  { id: "dalanzadgad", name: "Даланзадгад", province: "Өмнөговь", latitude: 43.5708, longitude: 104.425, timezone: "Asia/Ulaanbaatar" },
  { id: "sainshand", name: "Сайншанд", province: "Дорноговь", latitude: 44.8914, longitude: 110.1367, timezone: "Asia/Ulaanbaatar" },
  { id: "baruun_urt", name: "Баруун-Урт", province: "Сүхбаатар", latitude: 46.6806, longitude: 113.2792, timezone: "Asia/Choibalsan" },
  { id: "undurkhaan", name: "Чингис", province: "Хэнтий", latitude: 47.3147, longitude: 110.6556, timezone: "Asia/Ulaanbaatar" },
  { id: "altai", name: "Алтай", province: "Говь-Алтай", latitude: 46.3722, longitude: 96.2583, timezone: "Asia/Hovd" },
  { id: "bayankhongor", name: "Баянхонгор", province: "Баянхонгор", latitude: 46.1944, longitude: 100.7181, timezone: "Asia/Ulaanbaatar" },
  { id: "arvaikheer", name: "Арвайхээр", province: "Өвөрхангай", latitude: 46.2639, longitude: 102.775, timezone: "Asia/Ulaanbaatar" },
  { id: "sukhbaatar", name: "Сүхбаатар", province: "Сэлэнгэ", latitude: 50.2314, longitude: 106.2078, timezone: "Asia/Ulaanbaatar" },
];

export function cityById(id: string) {
  return MONGOLIAN_CITIES.find((city) => city.id === id);
}
