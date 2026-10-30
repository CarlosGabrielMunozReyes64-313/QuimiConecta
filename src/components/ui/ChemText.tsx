import { Fragment } from 'react'

import { SUBSCRIPTS } from '../../game/chemText'

/**
 * Muestra texto químico convirtiendo los subíndices Unicode (₂) en <sub>2</sub>,
 * porque la fuente pixel no tiene esos glifos.
 */
export function ChemText({ text }: { text: string }) {
  const parts = text.split(/([₀-₉]+)/u)
  return (
    <>
      {parts.map((part, i) =>
        /^[₀-₉]+$/u.test(part) ? (
          <sub key={i}>{[...part].map((c) => SUBSCRIPTS.indexOf(c)).join('')}</sub>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  )
}
