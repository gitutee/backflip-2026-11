# Football artwork

Generated using the built-in image_gen tool; no API credentials or CLI fallback. Original source: assets/fox.png. Project-bound assets are copied into assets/football/ and are served locally.

## Saved files

- assets/football/coach.png — original generated coach atlas, preserved.
- assets/football/coach-clean.png — final coach atlas with a flat white background. CSS multiply blending integrates it into the app; sprite positions select the four reactions.
- assets/football/players-1.png — first 16 portraits.
- assets/football/players-2.png — next 16 portraits.
- The third portrait-atlas output was rejected by the tool's output safety check (no specific actionable reason was provided). No failed image is used. The final 16 cards use a visible name-and-kit monogram.

## Coach prompt

Create one polished 2 by 2 sprite atlas of the SAME adorable orange fox football coach, using the attached fox face as visual reference. For an English-learning football game for a seven year old. Keep recognizable orange triangular ears, creamy cheeks, dark forest-green eyes, friendly geometric storybook design. Each of FOUR equal square cells has one full-body fox wearing a forest-green tracksuit with plain cream stripes and a small whistle. Top left: friendly neutral coach standing beside football. Top right: happy correct-answer thumbs up. Bottom left: warm encouraging coach offering another try, never sad or angry. Bottom right: cheerful celebration, one paw raised beside football. Flat polished editorial children's illustration with soft warm shading. Consistent size and centered placement within each equal cell, generous inset 12 percent. Exactly 2 columns and 2 rows, no border, no labels, no lettering, no logos. Real transparent background across the entire atlas.

## Portrait prompt set

Common specification: one square 4×4 atlas; exactly sixteen equal cells, no gaps; recognizable friendly illustrated head-and-shoulder portraits; fixed scale; plain football shirts; same pale sage background (#edf1e5); no text, logos, frames, flags or watermarks. Fan illustrations rather than photographs. Strict left-to-right row-major order.

Atlas 1: Cristiano Ronaldo; Lionel Messi; Lamine Yamal; Vinícius Júnior; Emiliano Martínez; Kylian Mbappé; Erling Haaland; Mohamed Salah; Harry Kane; Bukayo Saka; Raphinha; Ousmane Dembélé; Jude Bellingham; Rodri; Pedri; Virgil van Dijk.

Atlas 2: Alisson Becker; Thibaut Courtois; Gianluigi Donnarumma; Ederson; David Raya; Rúben Dias; William Saliba; Achraf Hakimi; Theo Hernández; João Cancelo; Trent Alexander-Arnold; Antonio Rüdiger; Marquinhos; Alessandro Bastoni; Joško Gvardiol; Pau Cubarsí.

Atlas 3 (not produced): Bruno Fernandes; Kevin De Bruyne; Luka Modrić; Federico Valverde; Jamal Musiala; Florian Wirtz; Declan Rice; Vitinha; Alexis Mac Allister; Enzo Fernández; Martin Ødegaard; Robert Lewandowski; Lautaro Martínez; Julián Álvarez; Son Heung-min; Nico Williams.

## Coach background cleanup edit

Built-in image_gen edit of coach.png: remove checkerboard/texture; replace background with uniform opaque white (#ffffff); preserve the four characters, poses, sizes and original wide atlas grid positions. No new text, logos or borders. The clean sibling asset is used by the app.
