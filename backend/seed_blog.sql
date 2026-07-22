-- Clear existing blog posts and re-seed
DELETE FROM blog_posts;

INSERT INTO blog_posts (title, slug, content, excerpt, meta_description, is_published, published_at) VALUES

-- Post 1: Diaper Size Guide
('How to Choose the Right Baby Diaper Size for Your Little One', 'choosing-right-diaper-size',
'<h2>Why Diaper Size Matters</h2>
<p>Choosing the right baby diaper size is more important than most parents realize. A correct fit prevents leaks, rashes, and discomfort &ndash; while a wrong size can cause irritation, sleepless nights, and constant diaper changes.</p>
<p>In this guide, you''ll learn how to select the perfect diaper size based on baby weight, fit test, and growth stage, plus why Farlin Diapers are trusted for accurate sizing and comfort.</p>

<h2>Diaper Size Chart by Weight (Farlin Recommended Sizes)</h2>
<table style="width:100%;border-collapse:collapse;margin:1em 0;">
<thead><tr style="background:#f0f9ff;"><th style="border:1px solid #e2e8f0;padding:10px;text-align:left;">Baby Weight (kg)</th><th style="border:1px solid #e2e8f0;padding:10px;text-align:left;">Suggested Size</th></tr></thead>
<tbody>
<tr><td style="border:1px solid #e2e8f0;padding:10px;">Up to 5 kg</td><td style="border:1px solid #e2e8f0;padding:10px;">Newborn (NB)</td></tr>
<tr><td style="border:1px solid #e2e8f0;padding:10px;">4&ndash;8 kg</td><td style="border:1px solid #e2e8f0;padding:10px;">Small (S)</td></tr>
<tr><td style="border:1px solid #e2e8f0;padding:10px;">6&ndash;11 kg</td><td style="border:1px solid #e2e8f0;padding:10px;">Medium (M)</td></tr>
<tr><td style="border:1px solid #e2e8f0;padding:10px;">9&ndash;14 kg</td><td style="border:1px solid #e2e8f0;padding:10px;">Large (L)</td></tr>
<tr><td style="border:1px solid #e2e8f0;padding:10px;">12&ndash;17 kg</td><td style="border:1px solid #e2e8f0;padding:10px;">Extra Large (XL)</td></tr>
</tbody></table>

<h2>How to Know If the Diaper Size Is Correct</h2>
<h3>Perfect Fit Checklist</h3>
<ul>
<li>Two-finger space between diaper waistband and baby''s tummy</li>
<li>No red marks on thighs or waist</li>
<li>Diaper doesn''t sag or leak during sleep/movement</li>
<li>Leg cuffs are outside, not folded inward</li>
</ul>

<h3>Signs You''re Using the Wrong Diaper Size</h3>
<table style="width:100%;border-collapse:collapse;margin:1em 0;">
<thead><tr style="background:#fef2f2;"><th style="border:1px solid #e2e8f0;padding:10px;">Too Small</th><th style="border:1px solid #e2e8f0;padding:10px;">Too Big</th></tr></thead>
<tbody>
<tr><td style="border:1px solid #e2e8f0;padding:10px;">Red marks on waist/thighs</td><td style="border:1px solid #e2e8f0;padding:10px;">Loose gaps at legs &amp; waist</td></tr>
<tr><td style="border:1px solid #e2e8f0;padding:10px;">Frequent leaks from back</td><td style="border:1px solid #e2e8f0;padding:10px;">Diaper keeps slipping</td></tr>
<tr><td style="border:1px solid #e2e8f0;padding:10px;">Baby fussiness or crying</td><td style="border:1px solid #e2e8f0;padding:10px;">Looks bulky or droopy</td></tr>
<tr><td style="border:1px solid #e2e8f0;padding:10px;">Tape doesn''t reach center</td><td style="border:1px solid #e2e8f0;padding:10px;">Pee leaks even when not full</td></tr>
</tbody></table>

<h2>When to Switch to the Next Diaper Size?</h2>
<p>As your baby grows, their diaper should grow with them. Using the correct size helps prevent leaks, rashes, and discomfort. Here''s how to know it''s time to size up:</p>
<ul>
<li>Weight crosses size limit</li>
<li>Two or more leaks happen in a day</li>
<li>Waistband leaves deep marks</li>
<li>Baby wakes up frequently due to discomfort</li>
</ul>

<h2>Newborn Diaper Size &ndash; What You Must Know</h2>
<p>Newborns have delicate skin and a healing umbilical cord area that needs extra care.</p>
<h3>How to choose the right newborn diaper size:</h3>
<ul>
<li>Must fit babies between 0&ndash;5 kg</li>
<li>Should not cover or irritate the umbilical cord stump</li>
<li>Should feel soft, breathable, and cotton-like</li>
<li>No tight marks around the belly or thighs</li>
</ul>

<h3>Why Parents Prefer Farlin Newborn Diapers:</h3>
<ul>
<li>Special cut-out design for the navel area</li>
<li>Ultra-soft cotton-touch surface</li>
<li>Fast absorption to prevent diaper rash</li>
<li>Hypoallergenic and dermatologically tested</li>
</ul>

<p>Choosing the right diaper size means less leakage, better sleep, and a happier baby. Select a size that perfectly matches weight, movement, and comfort &ndash; <strong>Littora is the trusted choice by parents across Sri Lanka.</strong></p>',
'A comprehensive guide to choosing the right baby diaper size based on weight, fit tests, and growth stages.',
'How to choose the right baby diaper size. Size chart, fit checklist, and when to size up.',
TRUE, '2025-11-19 00:00:00'),

-- Post 2: Caring for a Newborn (WHO)
('Caring for a Newborn - Tips by WHO', 'caring-for-a-newborn-who-tips',
'<h2>Caring for a Newborn</h2>
<p>The World Health Organization (WHO) recommends the following tips and information for newborn care:</p>

<h3>Newborn Care Essentials</h3>
<ul>
<li>Wipe the baby dry and clean and delay the first bath for at least 24 hours</li>
<li>Keep the baby warm with one or two layers of clothes more than adults and keep the head covered with a hat</li>
<li>Have the baby tested for eye and hearing problems and for jaundice</li>
<li>Keep the umbilical cord dry and do not apply anything on it, such as ointment</li>
<li>Keep the baby and the mother together in the same room and allow the baby to feed on demand</li>
<li>When the baby is small, keep the baby in skin-to-skin contact as much as possible every day</li>
<li>Wash hands with soap and water before handling the baby</li>
<li>Know the danger signs and where to seek care, such as if the baby is not feeding well, has fast breathing or a high temperature</li>
</ul>

<h2>Keeping Newborns and Children Under 5 Years Clean and Safe</h2>
<ul>
<li>Wash caregiver''s and children''s hands, such as before preparing and eating food, and after using the toilet</li>
<li>Use safe and clean water</li>
<li>Avoid going to the toilet in the open and disposing of human waste in the open</li>
<li>Store food safely and use clean utensils</li>
<li>Keep the home and baby''s clothing as clean as possible to protect from infection</li>
<li>Store unsafe and toxic substances safely out of reach of children</li>
<li>Keep the outdoor areas around the home clean</li>
<li>Secure open waters such as pools, wells and ponds so children cannot access them</li>
<li>Keep the home free of smoke from tobacco, cooking and heating</li>
</ul>

<p><em>Source: <a href="https://www.who.int/tools/your-life-your-health/life-phase/newborns-and-children-under-5-years" target="_blank" rel="noopener noreferrer">WHO &ndash; Tips and information for newborns and children under 5 years</a></em></p>',
'Essential newborn care tips recommended by the World Health Organization (WHO).',
'WHO-recommended newborn care tips. Learn how to keep your newborn clean, warm, and safe.',
TRUE, '2025-11-20 00:00:00'),

-- Post 3: Parenting Tips - Baby Nap Schedule
('Working Around Baby''s Nap Schedule', 'working-around-babys-nap-schedule',
'<h2>The First Year Revolves Around Naps</h2>
<p>The first year of Baby''s life revolves around very few things other than eating, playing, and (hopefully) lots of sleeping. Of course the &ldquo;sleeping through the night stage&rdquo; is the end goal for all new parents, but napping during the day can be just as important in creating a calm and happy environment for Mom and Baby.</p>
<p>If your baby does indeed nap, it can sometimes leave you feeling house-bound in order to preserve the nap time schedule. Here are a few tips to help preserve a nap routine, and also allow you to get out of the house.</p>

<h3>Prioritize the Best Nap</h3>
<p>Typically a consistently good napper will have at least one nap that is better than the other &ndash; for instance Baby will sleep for a longer and more sound stretch in the morning than the afternoon. If this is the case, schedule your activities around the one &ldquo;good&rdquo; nap, staying home so Baby can sleep in their own bed, and then venture out for the afternoon and possibly sacrifice the nap that usually isn''t as good. This will ensure Baby gets at least one good solid stretch of sleep during the day.</p>

<h3>Plan Outings Close to Home</h3>
<p>Plan outings closer to home so that if Baby starts getting fussy, you can make it home rather quickly &ndash; and before Baby falls asleep in the car. Ask just about any veteran parent and they''ll tell you that the car to crib transition doesn''t always go smoothly, so keep an interesting toy or book with Baby to keep them awake on the short ride home.</p>

<h3>Car Naps</h3>
<p>If the plan is to have Baby sleep in the car during nap time because of a road trip or timing issues, plan on playing music softly in the car so as not to disturb Baby too much, and always keep a book or magazine with you in case you arrive at your destination and Baby is still sleeping. Sometimes an extra 15&ndash;20 minutes added on to a Baby''s nap makes all the difference in their mood, so it can be worth it to sit back and relax a bit while you wait for Baby to wake.</p>

<h3>Napping on the Go</h3>
<p>If visiting a friend or family member for the day, plan ahead. Instead of rushing through your visit, bring a portable crib with you and set up a nursery away from home for Baby, complete with favourite blanket, pacifier and favourite book. Keep your nap routine consistent and try to settle Baby down for a nap on-the-go so that you don''t have to cut your visit short. While this doesn''t always work, it''s at least worth a try. The added bonus is it gets your baby used to sleeping in other environments, which is especially great if you plan to travel with Baby.</p>

<h3>Flexibility Is Key</h3>
<p>Consistency is key in any sleep routine, but the occasional alteration will not veer you completely off course, especially during the first 3&ndash;4 months. During this time newborns usually haven''t quite settled into a consistent routine anyhow, so this is the time to be a bit more flexible with your outings and straying from the routine. Once Baby is 4&ndash;6 months old though, a solid nap routine usually starts to settle in, so you''ll want to stay on course more than veer off it. Skipping the routine 2&ndash;3 times a week is perfectly okay, especially if it helps the parent feel better.</p>

<p>Remember that a sleep routine and schedule only works if it works for the entire family. If Baby''s routine is preserved at all costs, at the expense of the parent being able to occasionally visit with friends and get important errands done, then it''s not working. But making a few minor adjustments and not being afraid to alter off course every once in a while will ensure a happy, well-rested baby, and a happy, well-rested parent.</p>',
'Practical tips for managing your baby''s nap schedule while still getting out of the house.',
'Tips for working around baby nap schedules. Preserve nap routines while staying flexible.',
TRUE, '2025-11-21 00:00:00'),

-- Post 4: The Science Behind Diapers (Huggies references replaced with generic "Diapers")
('The Science Behind Diapers', 'the-science-behind-diapers',
'<h2>Designed for Baby''s Delicate Skin</h2>
<p>We know baby''s skin is delicate, especially during the early stages of development. That''s why modern diapers are designed to deliver gentle protection for babies, both inside and out. Every component of the diaper is highly engineered to keep babies'' skin clean and healthy and grow with the baby.</p>

<p>In the diapered area, prolonged exposure to irritants in poop, excessive moisture, and friction are the main contributors to skin barrier damage and the onset of diaper rash. When the integrity of the skin barrier is damaged, it is easier for irritants to enter the inner layers of the skin, triggering inflammation and the appearance of rash. Understanding the main causes of diaper rash and the unique needs of babies'' skin informs how diapers are designed.</p>

<h2>1. Promote Breathability</h2>
<h3>Breathable Outer Cover</h3>
<p>Quality diapers are constructed with a thin, breathable outer cover film specially designed to help protect baby and allow air to circulate, helping to keep baby''s skin dry and comfortable. This material is engineered to have microscopic pores to allow air to flow through the outer cover while keeping fluids, like urine and poop, from passing through.</p>

<h3>Umbilical Cord Cutout</h3>
<p>Doctors recommend leaving the umbilical cord uncovered to promote faster healing. Newborn diapers often contain a cutout in the front of the diaper to help promote air circulation and avoid irritating the umbilical cord area.</p>

<h2>2. Balance Skin Moisture</h2>
<h3>Wetness Indicator</h3>
<p>Many diapers feature a wetness indicator that reacts to small volumes of fluid and is visible in low light conditions, letting you know when it is time to change the diaper. When wet, the indicator line changes from a light-yellow colour to a blue/green colour. Changing the diaper promptly after baby pees helps keep skin clean, dry, and healthy.</p>

<h3>Blowout Blocker</h3>
<p>Modern diapers include a blowout blocker designed to gently conform to the baby and help prevent poop from escaping the waistband. The central region of the waistband creates a pocket that captures poop and provides a barrier between skin and mess.</p>

<h3>Absorbent Core</h3>
<p>A key component of healthy skin is keeping it dry. Superabsorbent material and fluff are combined inside the diaper to draw urine and poop away from the skin and lock it away in the core of the diaper.</p>

<h3>Body Side Liner</h3>
<p>Diapers are constructed using body side liner materials specially made to quickly intake, wick, and lock-away urine to help keep baby''s skin clean and healthy. The body side liner works with the acquisition and distribution layer to pull fluid into the absorbent core.</p>

<h3>GentleAbsorb Liner (for Newborns)</h3>
<p>Newborn babies have unique needs. Specialised newborn liners are designed to pull both urine and poop away from skin. This material provides a layer of comfort via an enhanced softness experience with a pillow-like texture. It absorbs urine and runny poop that contains rash-causing irritants and draws them gently away from baby''s skin.</p>

<h2>3. Soft Materials for Gentle Contact</h2>
<p>Every diaper component is carefully selected to be safe, soft, and gentle on a baby''s delicate skin:</p>
<ul>
<li><strong>Outer cover cloth:</strong> Covers the breathable barrier film to provide a soft touch</li>
<li><strong>Stretch ears:</strong> Soft to the touch, helping provide a comfortable fit</li>
<li><strong>Shaped design:</strong> The absorbent core and overall diaper design are shaped to gently contour around baby''s legs and body</li>
<li><strong>Containment flaps:</strong> Located on the inside to prevent urine from leaking out by providing a gentle gasket around baby''s legs</li>
<li><strong>Waistband:</strong> Helps keep poop inside the diaper while providing a comfortable fit and gentle skin contact</li>
<li><strong>Body side liner:</strong> Does triple-duty: pulling urine and mess towards the absorbent core, preventing urine from returning to the surface, and being gentle on skin with soft fibres</li>
</ul>

<h2>4. Safe for Sensitive Skin</h2>
<p>Quality diapers undergo a full product assessment and confirmatory safety testing by dermatologists to ensure they are gentle and safe for sensitive skin. They are typically:</p>
<ul>
<li>Fragrance-free</li>
<li>Paraben-free</li>
<li>Free of elemental chlorine</li>
<li>Lotion-free</li>
</ul>
<p>All materials and ingredients are thoroughly reviewed by toxicologists to ensure the products are safe for skin and do not contain harmful ingredients.</p>',
'Discover the science behind modern diapers - how they keep baby''s skin dry, breathable, and rash-free.',
'The science behind diaper design. Breathability, absorbency, and skin protection explained.',
TRUE, '2025-11-22 00:00:00');
