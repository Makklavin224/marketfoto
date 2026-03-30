# Worker Fonts

TTF font files for Pillow server-side text rendering. These match the frontend
canvas editor font set (14 Cyrillic-supporting families from Google Fonts).

## Font Families

| Family      | File(s)                                    | Type     |
|-------------|--------------------------------------------|----------|
| Inter       | Inter-Variable.ttf                         | Variable |
| Montserrat  | Montserrat-Variable.ttf                    | Variable |
| Rubik       | Rubik-Variable.ttf                         | Variable |
| Nunito      | Nunito-Variable.ttf                        | Variable |
| Roboto      | Roboto-Variable.ttf                        | Variable |
| Open Sans   | Open_Sans-Variable.ttf                     | Variable |
| Raleway     | Raleway-Variable.ttf                       | Variable |
| PT Sans     | PT_Sans-Regular.ttf, PT_Sans-Bold.ttf      | Static   |
| Comfortaa   | Comfortaa-Variable.ttf                     | Variable |
| Exo 2       | Exo_2-Variable.ttf                         | Variable |
| Jost        | Jost-Variable.ttf                          | Variable |
| Manrope     | Manrope-Variable.ttf                       | Variable |
| Play        | Play-Regular.ttf, Play-Bold.ttf            | Static   |
| Golos Text  | Golos_Text-Variable.ttf                    | Variable |

## Source

All fonts downloaded from the [Google Fonts GitHub repository](https://github.com/google/fonts).
Licensed under SIL Open Font License (OFL) or Apache License 2.0.

## Usage

Variable fonts support all weights (100-900) in a single file.
Pillow's `ImageFont.truetype(path, size=N)` works with both variable and static TTF files.

The `FONTS_DIR` environment variable points to this directory inside the Docker image (`/app/fonts`).
