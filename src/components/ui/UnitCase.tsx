/**
 * Keeps an area unit in parentheses - "Area (du)" - lowercase inside a heading
 * the stylesheet forces to UPPERCASE. Text is otherwise untouched.
 */
const UNIT_IN_PARENS = /(\((?:du|ha|dunums|hectares|دونم|هكتار)\))/g;

export function UnitCase({ children }: { children: string }) {
  return (
    <>
      {children.split(UNIT_IN_PARENS).map((part, i) =>
        i % 2 === 1 ? (
          <span key={i} className="normal-case">
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </>
  );
}
