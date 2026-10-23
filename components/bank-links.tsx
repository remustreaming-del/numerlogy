"use client";

import { useState } from "react";

export type BankLink = { name: string; description: string; link: string; logo?: string };

// QPay returns app deeplinks such as "khanbank://q?qPay_QRcode=…", so any scheme is allowed except ones that run code or read local data.
const BLOCKED_SCHEMES = /^(javascript|data|vbscript|file|blob):/i;
export const isSafeBankLink = (link: string) => /^[a-z][a-z0-9+.-]*:/i.test(link.trim()) && !BLOCKED_SCHEMES.test(link.trim());

function BankLogo({ bank }: { bank: BankLink }) {
  const [failed, setFailed] = useState(false);
  const label = bank.description || bank.name;
  if (failed || !bank.logo || !/^https:\/\//i.test(bank.logo)) return <span className="bank-fallback" aria-hidden="true">{label.slice(0, 1)}</span>;
  return <img src={bank.logo} alt="" width={44} height={44} referrerPolicy="no-referrer" onError={() => setFailed(true)} />;
}

export function BankLinks({ urls }: { urls: BankLink[] }) {
  const banks = urls.filter((bank) => typeof bank.link === "string" && isSafeBankLink(bank.link));
  if (!banks.length) return null;
  return <div className="bank-section">
    <p className="bank-hint">Утсаараа бол банкаа сонгоход апп нь нээгдэж, нэхэмжлэх шууд гарна.</p>
    <ul className="bank-links">
      {banks.map((bank) => <li key={bank.name}><a href={bank.link} rel="noreferrer"><BankLogo bank={bank} /><span>{bank.description || bank.name}</span></a></li>)}
    </ul>
  </div>;
}
