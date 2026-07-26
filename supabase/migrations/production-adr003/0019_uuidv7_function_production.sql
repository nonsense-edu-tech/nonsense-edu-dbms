-- ADR-003 dieu kien tien quyet: ham public.uuidv7() (RFC 9562 UUIDv7,
-- random method) dung lam khoa chinh cho toan bo he thong tu Phase 1.
--
-- Da kiem thu muc Trung binh (chot truoc do, xem ADR-003 Muc 7) tren
-- Supabase project nonsense-edu-staging (branching yeu cau Pro plan,
-- khong co san tren org nay -> dung staging project lam sandbox):
--   1. Khong trung lap o quy mo 1.040.000 gia tri qua 8 ket noi song
--      song: 1.040.000 dong, 1.040.000 gia tri phan biet, 0 trung lap.
--   2. Dung thu tu tang dan duoi ghi dong thoi tu 6 phien (>=5): dung
--      o muc granularity mili-giay (lech toi da giua timestamp nhung
--      trong UUID va clock_timestamp() thuc te: 1.4ms) - day la muc
--      dam bao chuan cua RFC 9562 "random method". KHONG dam bao thu
--      tu tuyet doi tung dong khi sinh nhieu dong trong cung 1ms
--      (~49% cap lien tiep bi dao thu tu trong cung mili-giay khi
--      sinh toc do cao) - day la han che da biet, chap nhan duoc cho
--      muc dich lam PK (index locality, sap xep tho theo thoi gian),
--      khong phai bo dem don dieu (RFC 9562 Method 3).

create or replace function public.uuidv7()
returns uuid
language plpgsql
volatile
set search_path = ''
as $$
declare
  ts_ms bigint := floor(extract(epoch from clock_timestamp()) * 1000)::bigint;
  buf bytea;
begin
  -- dung mot uuid v4 ngau nhien lam nguon entropy (ham loi core, khong
  -- can extension)
  buf := uuid_send(gen_random_uuid());
  -- ghi de 48 bit dau bang unix-ms timestamp, big-endian
  buf := overlay(buf placing substring(int8send(ts_ms) from 3 for 6) from 1 for 6);
  -- byte 6: ep nibble cao thanh 0111 (version 7), giu nguyen nibble
  -- thap ngau nhien (phan dau cua rand_a)
  buf := set_byte(buf, 6, 112 | (get_byte(buf, 6) & 15));
  -- byte 8: ep 2 bit cao thanh 10 (variant), giu nguyen 6 bit thap
  -- ngau nhien (phan dau cua rand_b)
  buf := set_byte(buf, 8, 128 | (get_byte(buf, 8) & 63));
  return encode(buf, 'hex')::uuid;
end;
$$;

comment on function public.uuidv7() is 'RFC 9562 UUIDv7 (random method): 48-bit unix-ms timestamp + 74 random bits. ADR-003 dieu kien tien quyet.';
