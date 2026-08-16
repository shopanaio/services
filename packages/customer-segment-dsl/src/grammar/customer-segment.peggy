{
  // Normative executable grammar. The generated TypeScript parser is checked
  // in as ../generated-parser.ts; production never generates or evals grammar.
  function sourceRange(value) {
    return {
      startOffset: value.start.offset,
      endOffset: value.end.offset,
      line: value.start.line,
      column: value.start.column,
    };
  }

  function ranged(kind, fields, value) {
    return { kind, ...fields, range: sourceRange(value) };
  }

  function logical(operator, head, tail, value) {
    const children = [head, ...tail.map((part) => part[3])];
    return children.length === 1
      ? head
      : ranged("logical", { operator, children }, value);
  }

  function scalarOperator(value) {
    return ({ "=": "eq", "!=": "neq", ">": "gt", ">=": "gte", "<": "lt", "<=": "lte" })[value];
  }

  function predicate(name, tail, value) {
    return ranged("predicate", {
      attribute: name.text,
      attributeRange: name.range,
      ...tail,
    }, value);
  }

  function parameter(name, tail, value) {
    return {
      name: name.text,
      nameRange: name.range,
      ...tail,
      range: sourceRange(value),
    };
  }

  function decodeEscape(value) {
    return ({ "\\'": "'", "\\\\": "\\", "\\n": "\n", "\\r": "\r", "\\t": "\t" })[value];
  }
}

Query
  = _ expression:OrExpression _ !. { return expression; }

OrExpression
  = head:AndExpression tail:(_ OR _ AndExpression)* {
      return logical("or", head, tail, location());
    }

AndExpression
  = head:UnaryExpression tail:(_ AND _ UnaryExpression)* {
      return logical("and", head, tail, location());
    }

UnaryExpression
  = NOT _ child:UnaryExpression {
      return ranged("not", { child }, location());
    }
  / "(" _ expression:OrExpression _ ")" {
      return { ...expression, range: sourceRange(location()) };
    }
  / Clause

Clause
  = FunctionClause
  / PredicateClause

PredicateClause
  = name:Identifier _ tail:PredicateTail {
      return predicate(name, tail, location());
    }

FunctionClause
  = name:Identifier _ operator:FunctionOperator _ "(" _ parameters:Parameters? _ ")" {
      return ranged("function", {
        name: name.text,
        nameRange: name.range,
        operator,
        parameters: parameters ?? [],
      }, location());
    }

FunctionOperator
  = MATCHES { return "matches"; }
  / NOT_MATCHES { return "not_matches"; }
  / NOT _ MATCHES { return "not_matches"; }

Parameters
  = head:Parameter tail:(_ "," _ Parameter)* {
      return [head, ...tail.map((part) => part[3])];
    }

Parameter
  = name:Identifier _ tail:ParameterTail {
      return parameter(name, tail, location());
    }

PredicateTail
  = BETWEEN _ lower:Value _ AND _ upper:Value {
      return { operator: "between", value: lower, upperValue: upper };
    }
  / operator:ListOperator _ "(" _ head:Value tail:(_ "," _ Value)* _ ")" {
      return { operator, values: [head, ...tail.map((part) => part[3])] };
    }
  / IS _ negated:(NOT _)? NULL {
      return { operator: negated ? "is_not_null" : "is_null" };
    }
  / operator:ContainsOperator _ value:Value {
      return { operator, value };
    }
  / operator:BinaryOperator _ value:Value {
      return { operator, value };
    }

ParameterTail
  = BETWEEN _ lower:Value _ AND _ upper:Value {
      return { operator: "between", value: lower, upperValue: upper };
    }
  / operator:ListOperator _ "(" _ head:Value tail:(_ "," _ Value)* _ ")" {
      return { operator, values: [head, ...tail.map((part) => part[3])] };
    }
  / IS _ negated:(NOT _)? NULL {
      return { operator: negated ? "is_not_null" : "is_null" };
    }
  / operator:BinaryOperator _ value:Value {
      return { operator, value };
    }

ListOperator
  = IN { return "in"; }
  / NOT _ IN { return "not_in"; }

ContainsOperator
  = CONTAINS { return "contains"; }
  / NOT _ CONTAINS { return "not_contains"; }

Value
  = DateTime
  / Date
  / RelativeDate
  / NamedDate
  / Boolean
  / Number
  / String

BinaryOperator
  = value:("!=" / ">=" / "<=" / "=" / ">" / "<") {
      return scalarOperator(value);
    }

Identifier
  = text:$([A-Za-z_][A-Za-z0-9_]*) {
      return { text, range: sourceRange(location()) };
    }

String
  = "'" chars:(Escape / ![\\'] .)* "'" {
      return ranged("string", { value: chars.join("") }, location());
    }

Escape
  = value:("\\'" / "\\\\" / "\\n" / "\\r" / "\\t") {
      return decodeEscape(value);
    }

IntegerPart
  = "0" ![0-9]
  / [1-9][0-9]*

Number
  = value:$([+-]? IntegerPart ("." [0-9]+)?) !IdentifierCharacter {
      return ranged("number", { value }, location());
    }

Date
  = value:$([0-9][0-9][0-9][0-9] "-" [0-9][0-9] "-" [0-9][0-9]) !IdentifierCharacter {
      return ranged("date", { value }, location());
    }

DateTime
  = value:$([0-9][0-9][0-9][0-9] "-" [0-9][0-9] "-" [0-9][0-9] "T" [0-9][0-9] ":" [0-9][0-9] ":" [0-9][0-9] ("Z" / [+-] [0-9][0-9] ":" [0-9][0-9])?) !IdentifierCharacter {
      return ranged("dateTime", { value }, location());
    }

RelativeDate
  = value:$([+-] IntegerPart [dDwWmMyY]) !IdentifierCharacter {
      return ranged("relativeDate", { value }, location());
    }

NamedDate
  = value:("today"i / "yesterday"i) !IdentifierCharacter {
      return ranged("namedDate", { value: value.toLowerCase() }, location());
    }

Boolean
  = value:("true"i / "false"i) !IdentifierCharacter {
      return ranged("boolean", { value: value.toLowerCase() === "true" }, location());
    }

AND = "AND"i !IdentifierCharacter
OR = "OR"i !IdentifierCharacter
NOT = "NOT"i !IdentifierCharacter
BETWEEN = "BETWEEN"i !IdentifierCharacter
IN = "IN"i !IdentifierCharacter
IS = "IS"i !IdentifierCharacter
NULL = "NULL"i !IdentifierCharacter
CONTAINS = "CONTAINS"i !IdentifierCharacter
MATCHES = "MATCHES"i !IdentifierCharacter
NOT_MATCHES = "NOT_MATCHES"i !IdentifierCharacter
IdentifierCharacter = [A-Za-z0-9_]
_ = [\x20\x09\x0A\x0D]*
