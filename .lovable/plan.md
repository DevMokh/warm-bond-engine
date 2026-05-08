# خطة: Best-of-3, Spectator, Synced Power-ups, Replay, Fullscreen

## نظرة عامة
خمس مزايا مترابطة: كلها بتعتمد على إن الـ match state (بما فيه الـ power-ups) يبقى مخزّن في DB ويتزامن لحظيًا، عشان المتفرج يشوف نفس اللي بيشوفه اللاعب، والـ Replay يقدر يعيد عرض كل حاجة بعدين.

## 1. تغييرات قاعدة البيانات (migration واحد)

### جدول `matches` — أعمدة جديدة
- `series_id uuid` — يجمع جولات Best-of-3 تحت نفس السلسلة
- `round_number int default 1` — رقم الجولة (1/2/3)
- `best_of int default 1` — 1 = ماتش عادي، 3 = Best-of-3
- `is_public_spectate bool default true` — يسمح بالمتفرجين

### جدول جديد `match_events`
سجل لحظي لكل ما يحصل في الماتش (إجابة، استخدام power-up، بداية سؤال). ده بيغذّي:
- المتفرج يشوف الأحداث realtime
- Replay يعيد عرضها بالتوقيت بعد الماتش
- Power-ups synced بين الطرفين والمتفرجين

أعمدة: `match_id`, `user_id`, `event_type` (answer/powerup_5050/powerup_freeze/powerup_double/question_start), `payload jsonb`, `question_index`, `created_at`.

### RLS
- `matches`: قراءة تبقى مفتوحة لو `is_public_spectate = true` (بدل القيد الحالي على اللاعبين فقط)
- `match_events`: insert للاعبين بس، select لأي حد يقدر يقرأ الماتش
- إضافة الجدول للـ realtime publication

## 2. مزامنة Power-ups
- لما اللاعب يستخدم power-up، يتعمل insert في `match_events` بدل ما يكون frontend-only
- الطرف التاني والمتفرج بيستقبلوه realtime ويعرضوا تأثير بصري (مثلاً "الخصم استخدم Freeze ❄️")
- 50/50 و Double Points يفضلوا local effect على اللاعب نفسه (مش معقول الخصم تتشال منه إجابات)، بس البادج بتظهر للكل
- Freeze يشتغل بس على اللاعب اللي استخدمه (مش الخصم)

## 3. Best-of-3 flow
- لو `best_of = 3` ولسه مفيش فايز للسلسلة:
  - بعد ما الجولة تخلص و winner_id يتحدد، يتعمل INSERT لماتش جديد بنفس `series_id` و `round_number + 1`
  - الـ MatchPlayer يفضل مفتوح ويلودش الماتش الجديد تلقائي
  - شاشة intermission قصيرة بين الجولات تعرض النتيجة المجمّعة (1-0، 2-1، إلخ)
- أول لاعب يوصل لـ 2 ينهي السلسلة

## 4. Spectator mode
- صفحة جديدة `/matches/:id/watch`
- نفس واجهة MatchPlayer بس بدون أزرار الإجابة، read-only
- بيشترك في realtime لـ `matches` + `match_events`
- بيعرض السؤال الحالي، التايمر، تقدم الطرفين، النتيجة
- زرار "شارك رابط المتابعة" في الـ MatchPlayer

## 5. Replay mode
- بعد ما الماتش/السلسلة تخلص، زرار "إعادة العرض"
- يقرا كل `match_events` للسلسلة ويعيد تشغيلها بنفس التوقيتات (مع Speed control: 1x/2x/4x)
- يعرض الـ power-ups وإجابة كل لاعب لحظة بلحظة

## 6. Fullscreen موحّد
- استخراج fullscreen logic في hook صغير `useFullscreen` ويستخدمه:
  - MatchPlayer (موجود)
  - Spectator screen (جديد)
  - Replay screen (جديد)
- زرار fullscreen يفضل في نفس المكان في كل الشاشات

## ملفات هتتغيّر
- migration جديد (الجداول والـ RLS والـ realtime)
- `src/components/MatchPlayer.tsx` — power-ups تتعمل insert بدل local، Best-of-3 flow، زرار share watch link
- `src/pages/SpectateMatch.tsx` — جديد
- `src/pages/ReplayMatch.tsx` — جديد
- `src/hooks/useFullscreen.ts` — جديد
- `src/components/MatchTimeline.tsx` — جديد (يستخدمه Replay و Spectator)
- `src/App.tsx` — routes جديدة

## مخاطر / ملاحظات
- `match_events` ممكن يكبر بسرعة — هنحط index على `match_id` و TTL لاحقًا لو لزم
- Best-of-3 لو حد قفل المتصفح في النص، الجولة التالية ما تبدأش — هنخلي الحالة `pending` لحد ما الطرفين يدخلوا
- Spectator مفتوح للكل بشكل افتراضي — لو عايز قصره على الأصدقاء قولّي
