-- Sprint 6.4: payment handle at settle time.
-- Free text (a Venmo/UPI id, a link, "cash only"), shown to whoever is paying
-- this person. Record-keeping only: no money moves through the app.
ALTER TABLE "Person" ADD COLUMN "paymentHandle" VARCHAR(100);
