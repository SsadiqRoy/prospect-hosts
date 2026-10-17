import {
  FiPhone,
  FiMail,
  FiMessageSquare,
  FiGlobe,
  FiExternalLink,
  FiInstagram,
  FiFacebook,
  FiLinkedin,
  FiYoutube,
  FiLink,
} from "react-icons/fi";
import { FaWhatsapp, FaTiktok, FaXTwitter } from "react-icons/fa6";
import {
  phoneDigits,
  safeUrl,
  socialUrl,
  type Prospect,
} from "@/lib/prospects";
export function ContactLinks({
  p,
  onlineOnly = false,
}: {
  p: Prospect;
  onlineOnly?: boolean;
}) {
  const icons = {
    Instagram: FiInstagram,
    Facebook: FiFacebook,
    TikTok: FaTiktok,
    LinkedIn: FiLinkedin,
    YouTube: FiYoutube,
    X: FaXTwitter,
    Other: FiLink,
  };
  return (
    <>
      {!onlineOnly && (
        <>
          {p.phones.map((phone, i) => (
            <a key={"p" + i} href={"tel:+" + phoneDigits(phone)}>
              <FiPhone />
              {p.phones.length > 1 ? `Call ${phone}` : "Call"}
            </a>
          ))}
          {p.emails.map((email, i) => (
            <a key={"e" + i} href={"mailto:" + encodeURIComponent(email)}>
              <FiMail />
              {p.emails.length > 1 ? email : "Send email"}
            </a>
          ))}
          {p.phones[0] && (
            <a href={"sms:+" + phoneDigits(p.phones[0])}>
              <FiMessageSquare />
              Send SMS
            </a>
          )}
          {p.whatsapp && (
            <a
              href={"https://wa.me/" + phoneDigits(p.whatsapp)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaWhatsapp />
              WhatsApp
              <FiExternalLink className="external" />
            </a>
          )}
        </>
      )}
      {p.website && safeUrl(p.website) && (
        <a href={safeUrl(p.website)} target="_blank" rel="noopener noreferrer">
          <FiGlobe />
          Website
          <FiExternalLink className="external" />
        </a>
      )}
      {p.socials.map((s, i) => {
        const Icon = icons[s.platform] ?? FiLink;
        const href = socialUrl(s.platform, s.value);
        return href ? (
          <a key={i} href={href} target="_blank" rel="noopener noreferrer">
            <Icon />
            {s.platform}
            <FiExternalLink className="external" />
          </a>
        ) : null;
      })}
    </>
  );
}
