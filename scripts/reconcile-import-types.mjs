import fs from "node:fs/promises";
import path from "node:path";
import ts from "typescript";

const ROOT = process.cwd();

const files = [];

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(fullPath);
      continue;
    }
    if (
      entry.isFile() &&
      fullPath.endsWith(".ts") &&
      !fullPath.endsWith(".d.ts")
    ) {
      if (fullPath.includes(`${path.sep}src${path.sep}`)) {
        files.push(fullPath);
      }
    }
  }
}

function isValueContext(node) {
  for (let current = node; current != null; current = current.parent) {
    if (
      ts.isImportDeclaration(current) ||
      ts.isImportClause(current) ||
      ts.isImportSpecifier(current) ||
      ts.isNamespaceImport(current) ||
      ts.isImportEqualsDeclaration(current) ||
      ts.isExportSpecifier(current)
    ) {
      return false;
    }

    if (
      ts.isExpressionWithTypeArguments(current) &&
      ts.isHeritageClause(current.parent)
    ) {
      const heritage = current.parent;
      if (heritage.token === ts.SyntaxKind.ExtendsKeyword) {
        return ts.isClassLike(heritage.parent);
      }
      return false;
    }

    if (ts.isHeritageClause(current)) {
      if (current.token === ts.SyntaxKind.ImplementsKeyword) {
        return false;
      }
      if (current.token === ts.SyntaxKind.ExtendsKeyword) {
        return ts.isClassLike(current.parent);
      }
    }

    if (ts.isTypeQueryNode(current)) {
      return true;
    }

    if (ts.isTypeNode(current)) {
      return false;
    }
  }

  return true;
}

function getImportName(specifier) {
  return specifier.name.text;
}

function getSpecifierText(specifier, typeOnly) {
  const text = specifier.propertyName
    ? `${specifier.propertyName.text} as ${specifier.name.text}`
    : specifier.name.text;
  return typeOnly ? `type ${text}` : text;
}

async function main() {
  await walk(path.join(ROOT, "packages"));

  let changedFiles = 0;
  let changedImports = 0;

  for (const filePath of files) {
    const sourceText = await fs.readFile(filePath, "utf8");
    const sourceFile = ts.createSourceFile(
      filePath,
      sourceText,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );

    const edits = [];
    let fileChanged = false;

    for (const statement of sourceFile.statements) {
      if (
        !ts.isImportDeclaration(statement) ||
        statement.moduleSpecifier == null
      ) {
        continue;
      }

      const importClause = statement.importClause;
      if (importClause == null) {
        continue;
      }

      const namespaceImport = importClause.namedBindings;
      const namedImports =
        namespaceImport != null && ts.isNamedImports(namespaceImport)
          ? namespaceImport.elements
          : [];
      const defaultName = importClause.name?.text ?? null;
      const moduleText = statement.moduleSpecifier.getText(sourceFile);

      const keptNamedImports = [];
      let hasValueUsage = false;

      for (const specifier of namedImports) {
        const importedName = getImportName(specifier);
        const occurrences = [];

        function visit(node) {
          if (ts.isIdentifier(node) && node.text === importedName) {
            const parent = node.parent;
            const isImportBinding =
              ts.isImportSpecifier(parent) ||
              ts.isImportClause(parent) ||
              ts.isNamespaceImport(parent) ||
              ts.isImportEqualsDeclaration(parent);
            if (!isImportBinding) {
              occurrences.push(node);
            }
          }
          ts.forEachChild(node, visit);
        }

        visit(sourceFile);

        if (occurrences.length === 0) {
          continue;
        }

        const valueUsage = occurrences.some((node) => isValueContext(node));
        if (valueUsage) {
          hasValueUsage = true;
        }

        keptNamedImports.push({
          specifier,
          importedName,
          valueUsage,
        });
      }

      const hasAnyNamedImports = keptNamedImports.length > 0;
      const originalText = statement.getText(sourceFile);

      if (!hasAnyNamedImports && defaultName == null) {
        edits.push({
          start: statement.getFullStart(),
          end: statement.getEnd(),
          text: "",
        });
        fileChanged = true;
        changedImports += 1;
        continue;
      }

      const typeOnlyDeclaration = importClause.isTypeOnly && !hasValueUsage;

      const namedText = hasAnyNamedImports
        ? `{ ${keptNamedImports
            .map(({ specifier, valueUsage }) =>
              getSpecifierText(specifier, !valueUsage && !typeOnlyDeclaration),
            )
            .join(", ")} }`
        : null;

      const pieces = [];
      if (defaultName != null) {
        pieces.push(defaultName);
      }
      if (namedText != null) {
        pieces.push(namedText);
      }

      const keyword = typeOnlyDeclaration ? "import type" : "import";
      const replacement =
        pieces.length > 0
          ? `${keyword} ${pieces.join(", ")} from ${moduleText};`
          : originalText;

      if (replacement !== originalText) {
        edits.push({
          start: statement.getFullStart(),
          end: statement.getEnd(),
          text: replacement,
        });
        fileChanged = true;
        changedImports += 1;
      }
    }

    if (!fileChanged) {
      continue;
    }

    let updated = sourceText;
    edits
      .sort((a, b) => b.start - a.start)
      .forEach(({ start, end, text }) => {
        updated = `${updated.slice(0, start)}${text}${updated.slice(end)}`;
      });
    await fs.writeFile(filePath, updated);
    changedFiles += 1;
  }

  console.log(
    `Updated ${changedFiles} file(s), ${changedImports} import declaration(s).`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
