# @litium-cli/translation

Pull Litium translations, pages, blocks and products into Excel, push Excel back into project yaml

![Logo](https://raw.githubusercontent.com/henry/litium-translation-sync/refs/heads/main/asset/logo.svg)

---

![Type](https://img.shields.io/badge/Type-packages-orange)
[![Tests](https://github.com/henry/litium-translation-sync/actions/workflows/pull-request.yml/badge.svg)](https://github.com/henry/litium-translation-sync/actions/workflows/pull-request.yml)
[![NPM version](https://img.shields.io/npm/v/@litium-cli/translation.svg?logo=npm)](https://www.npmjs.com/package/@litium-cli/translation)

---

## installation

```bash
npm install @litium-cli/translation
```

## License

Licensed under the @Papit License 1.0 - Copyright (c) 2024 Henry Pap (@onkelhoy)

**Key points:**

- ✅ Free to use in commercial projects
- ✅ Free to modify and distribute
- ✅ Attribution required
- ❌ Cannot resell the component itself as a standalone product

See the [LICENSE](https://github.com/onkelhoy/papit/blob/main/LICENSE) file for full details.

# CLI flags

| Flag | Command | Description |
| --- | --- | --- |
| `pull` / `push` / `inspect` / `help` | all | Command. Prompted when missing. `inspect` saves raw server responses for debugging. |
| `--url=<url>` | pull, inspect | Litium backend url. Prompted when missing. |
| `--client-id=<id>` | pull, inspect | API client id. Prompted when missing. |
| `--client-secret=<secret>` | pull, inspect | API client secret. Prompted when missing. |
| `--include=<list>` | pull | `translations,blocks,pages,products` (default all). |
| `--website=<id\|name>` | pull | Website for translations, prompted when there are several. |
| `--system-fields` | pull | Also include Litium system fields (`_name`, `_url` …). |
| `--out=<path>` | pull, inspect | Excel file (pull) or folder for raw dumps (inspect, default `./inspect`). |
| `--in=<file.xlsx>` | push | Excel to read. |
| `--project=<path>` | push | Project whose `litium/` folder gets updated. |
| `--dry` | push | Show changes, write nothing. |
| `--apply` | push | Write without asking. |
| `--prune` | push | Also remove options missing on the server. |
| `--verbose`, `--debug` | all | Log levels. |

# Notes
