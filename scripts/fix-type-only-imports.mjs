import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const repoRoot = process.cwd();
const sourceFiles = collectSourceFiles(path.join(repoRoot, "packages"));
const program = ts.createProgram(sourceFiles, {
  allowJs: false,
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.NodeNext,
  moduleResolution: ts.ModuleResolutionKind.NodeNext,
  strict: true,
  verbatimModuleSyntax: true,
  esModuleInterop: true,
  skipLibCheck: true,
  forceConsistentCasingInFileNames: true,
  experimentalDecorators: true,
  emitDecoratorMetadata: true,
  types: ["node"],
});
const checker = program.getTypeChecker();
const edits = [];

for (const sourceFile of program.getSourceFiles()) {
  if (!isRepoSourceFile(sourceFile.fileName)) {
    continue;
  }

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)) {
      continue;
    }

    const importClause = statement.importClause;
    if (importClause == null || importClause.isTypeOnly) {
      continue;
    }

    if (importClause.name != null || importClause.namedBindings == null) {
      continue;
    }

    if (!ts.isNamedImports(importClause.namedBindings)) {
      continue;
    }

    const bindings = importClause.namedBindings.elements;
    if (bindings.length === 0) {
      continue;
    }

    if (bindings.every((binding) => isTypeOnlyImport(binding, sourceFile))) {
      edits.push({
        fileName: sourceFile.fileName,
        start: importClause.getStart(sourceFile),
        end: importClause.getEnd(),
        text: `type ${statement.importClause.getText(sourceFile)}`,
      });
    }
  }
}

applyEdits(edits);
console.log(`Rewrote ${edits.length} import declaration(s) to type-only.`);

function isTypeOnlyImport(binding, sourceFile) {
  const symbol = checker.getSymbolAtLocation(
    binding.propertyName ?? binding.name,
  );
  if (symbol == null) {
    return false;
  }

  const resolved =
    (symbol.flags & ts.SymbolFlags.Alias) !== 0
      ? checker.getAliasedSymbol(symbol)
      : symbol;

  for (const reference of findReferences(sourceFile, resolved)) {
    if (!isInTypePosition(reference)) {
      return false;
    }
  }

  return true;
}

function findReferences(sourceFile, symbol) {
  const references = [];
  function visit(node) {
    if (ts.isIdentifier(node)) {
      if (isInsideImportDeclaration(node)) {
        ts.forEachChild(node, visit);
        return;
      }
      const nodeSymbol = checker.getSymbolAtLocation(node);
      if (nodeSymbol != null) {
        const resolved =
          (nodeSymbol.flags & ts.SymbolFlags.Alias) !== 0
            ? checker.getAliasedSymbol(nodeSymbol)
            : nodeSymbol;
        if (resolved === symbol) {
          references.push(node);
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return references;
}

function isInsideImportDeclaration(node) {
  let current = node.parent;
  while (current != null) {
    if (ts.isImportDeclaration(current)) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

function isInTypePosition(node) {
  let current = node;
  while (current.parent != null) {
    current = current.parent;
    if (ts.isTypeNode(current)) {
      return true;
    }
    if (
      ts.isHeritageClause(current) ||
      ts.isTypeParameterDeclaration(current) ||
      ts.isJSDocTypeExpression(current)
    ) {
      return true;
    }
    if (ts.isImportTypeNode(current)) {
      return true;
    }
    if (
      ts.isTypeAliasDeclaration(current) ||
      ts.isInterfaceDeclaration(current) ||
      ts.isTypeLiteralNode(current) ||
      ts.isExpressionWithTypeArguments(current)
    ) {
      return true;
    }
    if (ts.isExpressionStatement(current) || ts.isVariableStatement(current)) {
      return false;
    }
  }
  return false;
}

function applyEdits(editsToApply) {
  const grouped = new Map();
  for (const edit of editsToApply) {
    const existing = grouped.get(edit.fileName);
    if (existing == null) {
      grouped.set(edit.fileName, [edit]);
      continue;
    }
    existing.push(edit);
  }

  for (const [fileName, fileEdits] of grouped.entries()) {
    fileEdits.sort((a, b) => b.start - a.start);
    let text = fs.readFileSync(fileName, "utf8");
    for (const edit of fileEdits) {
      text = `${text.slice(0, edit.start)}${edit.text}${text.slice(edit.end)}`;
    }
    fs.writeFileSync(fileName, text);
  }
}

function collectSourceFiles(rootDir) {
  const files = [];
  walk(rootDir, files);
  return files.filter((file) => file.endsWith(".ts") || file.endsWith(".tsx"));
}

function walk(dir, files) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const resolved = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "dist" || entry.name === "node_modules") {
        continue;
      }
      walk(resolved, files);
      continue;
    }
    if (entry.isFile()) {
      files.push(resolved);
    }
  }
}

function isRepoSourceFile(fileName) {
  const normalized = fileName.replaceAll(path.sep, "/");
  return normalized.includes("/packages/") && normalized.includes("/src/");
}
