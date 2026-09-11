-- 1. anon rolünden tüm tablolardaki CRUD yetkilerini geri al
-- Bu uygulama yalnızca giriş yapmış (authenticated) kullanıcılar içindir.
REVOKE ALL ON "public"."feedback" FROM anon;
REVOKE ALL ON "public"."gunluk_ozetler" FROM anon;
REVOKE ALL ON "public"."subscriptions" FROM anon;

-- 2. feedback tablosu: public rolüne tanımlı yinelenen politikaları kaldır
--    (authenticated politikaları zaten mevcut ve doğru)
DROP POLICY IF EXISTS "Users can insert their own feedback" ON "public"."feedback";
DROP POLICY IF EXISTS "Users can view their own feedback" ON "public"."feedback";

-- 3. gunluk_ozetler tablosu: FOR ALL politikasını kaldır (CRUD başına ayrı politikalar zaten var)
DROP POLICY IF EXISTS "Kullanicilar kendi ozetlerini yonetebilir" ON "public"."gunluk_ozetler";

-- 4. authenticated rolüne sadece kendi verilerine erişim politikalarını ekle (eksik yoksa)
-- feedback: authenticated politikaları zaten mevcut (select_own, insert_own, update_own, delete_own)
-- gunluk_ozetler: authenticated politikaları zaten mevcut (select_own, insert_own, update_own, delete_own)
-- subscriptions: authenticated politikaları zaten mevcut (select_own, insert_own, update_own, delete_own)

-- 5. authenticated rolüne gerekli yetkileri ver (anon zaten revoke edildi)
GRANT SELECT, INSERT, UPDATE, DELETE ON "public"."feedback" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "public"."gunluk_ozetler" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "public"."subscriptions" TO authenticated;
