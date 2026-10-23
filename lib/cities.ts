export type BirthCity = {
  id: string;
  name: string;
  /** Aimag for Mongolian places, country (and region) abroad. */
  province: string;
  latin: string;
  latitude: number;
  longitude: number;
  timezone: string;
  group: "mongolia" | "abroad";
};

// Local catalogue: no geocoding request is ever made for a birthplace.
// Coordinates are city centres (WGS84). A birth in a soum or a city not listed
// here uses the "custom" place (latitude, longitude, IANA zone) instead.
const mn = (id: string, name: string, province: string, latin: string, latitude: number, longitude: number, timezone = "Asia/Ulaanbaatar"): BirthCity => ({ id, name, province, latin, latitude, longitude, timezone, group: "mongolia" });
const abroad = (id: string, name: string, province: string, latin: string, latitude: number, longitude: number, timezone: string): BirthCity => ({ id, name, province, latin, latitude, longitude, timezone, group: "abroad" });

export const MONGOLIAN_CITIES: BirthCity[] = [
  mn("ulaanbaatar", "Улаанбаатар", "Нийслэл", "Ulaanbaatar", 47.9185, 106.9177),
  mn("nalaikh", "Налайх", "Нийслэл", "Nalaikh", 47.7520, 107.2540),
  mn("erdenet", "Эрдэнэт", "Орхон", "Erdenet", 49.0278, 104.0444),
  mn("darkhan", "Дархан", "Дархан-Уул", "Darkhan", 49.4867, 105.9228),
  mn("choibalsan", "Чойбалсан", "Дорнод", "Choibalsan", 48.0726, 114.5326, "Asia/Choibalsan"),
  mn("hovd", "Ховд", "Ховд", "Khovd", 48.0056, 91.6419, "Asia/Hovd"),
  mn("ulgii", "Өлгий", "Баян-Өлгий", "Ulgii", 48.9683, 89.9625, "Asia/Hovd"),
  mn("ulaangom", "Улаангом", "Увс", "Ulaangom", 49.9811, 92.0667, "Asia/Hovd"),
  mn("uliastai", "Улиастай", "Завхан", "Uliastai", 47.7417, 96.8444, "Asia/Hovd"),
  mn("altai", "Алтай", "Говь-Алтай", "Altai", 46.3722, 96.2583, "Asia/Hovd"),
  mn("murun", "Мөрөн", "Хөвсгөл", "Murun", 49.6342, 100.1625),
  mn("tsetserleg", "Цэцэрлэг", "Архангай", "Tsetserleg", 47.4769, 101.4503),
  mn("bulgan", "Булган", "Булган", "Bulgan", 48.8125, 103.5347),
  mn("zuunmod", "Зуунмод", "Төв", "Zuunmod", 47.7069, 106.9528),
  mn("choir", "Чойр", "Говьсүмбэр", "Choir", 46.3606, 108.3614),
  mn("mandalgovi", "Мандалговь", "Дундговь", "Mandalgovi", 45.7625, 106.2708),
  mn("dalanzadgad", "Даланзадгад", "Өмнөговь", "Dalanzadgad", 43.5708, 104.4250),
  mn("sainshand", "Сайншанд", "Дорноговь", "Sainshand", 44.8914, 110.1367),
  mn("zamyn_uud", "Замын-Үүд", "Дорноговь", "Zamyn-Uud", 43.7162, 111.9046),
  mn("baruun_urt", "Баруун-Урт", "Сүхбаатар", "Baruun-Urt", 46.6806, 113.2792, "Asia/Choibalsan"),
  mn("undurkhaan", "Чингис", "Хэнтий", "Chinggis (Undurkhaan)", 47.3147, 110.6556),
  mn("bayankhongor", "Баянхонгор", "Баянхонгор", "Bayankhongor", 46.1944, 100.7181),
  mn("arvaikheer", "Арвайхээр", "Өвөрхангай", "Arvaikheer", 46.2639, 102.7750),
  mn("kharkhorin", "Хархорин", "Өвөрхангай", "Kharkhorin", 47.1975, 102.8238),
  mn("sukhbaatar", "Сүхбаатар", "Сэлэнгэ", "Sukhbaatar", 50.2314, 106.2078),
];

export const ABROAD_CITIES: BirthCity[] = [
  abroad("seoul", "Сөүл", "Өмнөд Солонгос", "Seoul", 37.5665, 126.9780, "Asia/Seoul"),
  abroad("incheon", "Инчон", "Өмнөд Солонгос", "Incheon", 37.4563, 126.7052, "Asia/Seoul"),
  abroad("busan", "Пусан", "Өмнөд Солонгос", "Busan", 35.1796, 129.0756, "Asia/Seoul"),
  abroad("tokyo", "Токио", "Япон", "Tokyo", 35.6762, 139.6503, "Asia/Tokyo"),
  abroad("osaka", "Осака", "Япон", "Osaka", 34.6937, 135.5023, "Asia/Tokyo"),
  abroad("beijing", "Бээжин", "БНХАУ", "Beijing", 39.9042, 116.4074, "Asia/Shanghai"),
  abroad("hohhot", "Хөх хот", "БНХАУ, Өвөр Монгол", "Hohhot", 40.8424, 111.7490, "Asia/Shanghai"),
  abroad("erenhot", "Эрээн", "БНХАУ, Өвөр Монгол", "Erenhot", 43.6531, 111.9772, "Asia/Shanghai"),
  abroad("shanghai", "Шанхай", "БНХАУ", "Shanghai", 31.2304, 121.4737, "Asia/Shanghai"),
  abroad("bangkok", "Бангкок", "Тайланд", "Bangkok", 13.7563, 100.5018, "Asia/Bangkok"),
  abroad("moscow", "Москва", "ОХУ", "Moscow", 55.7558, 37.6173, "Europe/Moscow"),
  abroad("saint_petersburg", "Санкт-Петербург", "ОХУ", "Saint Petersburg", 59.9311, 30.3609, "Europe/Moscow"),
  abroad("novosibirsk", "Новосибирск", "ОХУ", "Novosibirsk", 55.0084, 82.9357, "Asia/Novosibirsk"),
  abroad("irkutsk", "Эрхүү", "ОХУ", "Irkutsk", 52.2870, 104.3050, "Asia/Irkutsk"),
  abroad("ulan_ude", "Улаан-Үд", "ОХУ, Буриад", "Ulan-Ude", 51.8335, 107.5841, "Asia/Irkutsk"),
  abroad("kyzyl", "Кызыл", "ОХУ, Тува", "Kyzyl", 51.7191, 94.4378, "Asia/Krasnoyarsk"),
  abroad("almaty", "Алматы", "Казахстан", "Almaty", 43.2389, 76.8897, "Asia/Almaty"),
  abroad("astana", "Астана", "Казахстан", "Astana", 51.1694, 71.4491, "Asia/Almaty"),
  abroad("istanbul", "Истанбул", "Турк", "Istanbul", 41.0082, 28.9784, "Europe/Istanbul"),
  abroad("ankara", "Анкара", "Турк", "Ankara", 39.9334, 32.8597, "Europe/Istanbul"),
  abroad("dubai", "Дубай", "АНЭУ", "Dubai", 25.2048, 55.2708, "Asia/Dubai"),
  abroad("prague", "Прага", "Чех", "Prague", 50.0755, 14.4378, "Europe/Prague"),
  abroad("brno", "Брно", "Чех", "Brno", 49.1951, 16.6068, "Europe/Prague"),
  abroad("berlin", "Берлин", "Герман", "Berlin", 52.5200, 13.4050, "Europe/Berlin"),
  abroad("frankfurt", "Франкфурт", "Герман", "Frankfurt", 50.1109, 8.6821, "Europe/Berlin"),
  abroad("munich", "Мюнхен", "Герман", "Munich", 48.1351, 11.5820, "Europe/Berlin"),
  abroad("warsaw", "Варшав", "Польш", "Warsaw", 52.2297, 21.0122, "Europe/Warsaw"),
  abroad("vienna", "Вена", "Австри", "Vienna", 48.2082, 16.3738, "Europe/Vienna"),
  abroad("budapest", "Будапешт", "Унгар", "Budapest", 47.4979, 19.0402, "Europe/Budapest"),
  abroad("amsterdam", "Амстердам", "Нидерланд", "Amsterdam", 52.3676, 4.9041, "Europe/Amsterdam"),
  abroad("brussels", "Брюссель", "Бельги", "Brussels", 50.8503, 4.3517, "Europe/Brussels"),
  abroad("paris", "Парис", "Франц", "Paris", 48.8566, 2.3522, "Europe/Paris"),
  abroad("london", "Лондон", "Их Британи", "London", 51.5074, -0.1278, "Europe/London"),
  abroad("stockholm", "Стокгольм", "Швед", "Stockholm", 59.3293, 18.0686, "Europe/Stockholm"),
  abroad("sydney", "Сидней", "Австрали", "Sydney", -33.8688, 151.2093, "Australia/Sydney"),
  abroad("melbourne", "Мельбурн", "Австрали", "Melbourne", -37.8136, 144.9631, "Australia/Melbourne"),
  abroad("brisbane", "Брисбен", "Австрали", "Brisbane", -27.4698, 153.0251, "Australia/Brisbane"),
  abroad("new_york", "Нью-Йорк", "АНУ", "New York", 40.7128, -74.0060, "America/New_York"),
  abroad("washington", "Вашингтон", "АНУ", "Washington DC", 38.9072, -77.0369, "America/New_York"),
  abroad("boston", "Бостон", "АНУ", "Boston", 42.3601, -71.0589, "America/New_York"),
  abroad("chicago", "Чикаго", "АНУ", "Chicago", 41.8781, -87.6298, "America/Chicago"),
  abroad("denver", "Денвер", "АНУ", "Denver", 39.7392, -104.9903, "America/Denver"),
  abroad("los_angeles", "Лос-Анжелес", "АНУ", "Los Angeles", 34.0522, -118.2437, "America/Los_Angeles"),
  abroad("san_francisco", "Сан-Франциско", "АНУ", "San Francisco", 37.7749, -122.4194, "America/Los_Angeles"),
  abroad("seattle", "Сиэтл", "АНУ", "Seattle", 47.6062, -122.3321, "America/Los_Angeles"),
  abroad("toronto", "Торонто", "Канад", "Toronto", 43.6532, -79.3832, "America/Toronto"),
  abroad("vancouver", "Ванкувер", "Канад", "Vancouver", 49.2827, -123.1207, "America/Vancouver"),
];

export const ALL_CITIES: BirthCity[] = [...MONGOLIAN_CITIES, ...ABROAD_CITIES];
export const CUSTOM_PLACE_ID = "custom";

/** IANA zones offered for a custom place: every catalogue zone, Mongolia first. */
export const PLACE_TIMEZONES: string[] = [...new Set(ALL_CITIES.map((city) => city.timezone))];

export function cityById(id: string) {
  return ALL_CITIES.find((city) => city.id === id);
}
