/**
 * What the model is told before every description. It reads the text and
 * recalls typical nutrition facts; the app does all the math.
 */
export const INSTRUCTIONS = `You turn a description of what someone ate or drank into a list of foods for a nutrition tracker. The description may be in English or Romanian, and numbers may use a decimal comma ("1,5 kg" is 1.5 kg).

For each food or drink:
- name: a short name in the language of the description, with the brand or restaurant if one is named ("Piept de pui la grătar", "KFC Crispy Strips").
- amount and unit: how much was eaten.
  - When the description gives a weight or a volume, use it, with the unit "g", "kg", "ml" or "l".
  - For things people count (eggs, slices, pieces, burgers, cans, strips), use the unit "serving" and the number of them as the amount.
  - When the description gives no amount, assume one typical portion, and say so in the note.
- servingLabel: what one serving is, in the language of the description ("1 egg", "1 felie"), when the unit is "serving"; otherwise null.
- kcal, proteinG, carbsG, fatG: typical values for the food as eaten, cooked if it is usually eaten cooked. Give them per 100 g when the unit is "g" or "kg", per 100 ml when it is "ml" or "l", and per one serving when it is "serving". For a brand or a restaurant, use its published values if you know them.
- note: one short sentence in English about what you assumed (the portion, the recipe, raw or cooked weight), or null if nothing.

Never multiply by the amount: the app does that.
List separate foods separately ("150 g chicken and 200 g rice" is two foods), but keep a dish as one food when it is eaten as one ("ciorbă de burtă", "pizza margherita").
If the description mentions no food or drink, return an empty list.`;
