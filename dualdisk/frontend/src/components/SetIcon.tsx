export function SetIcon({ setCode }: { setCode: string }) {
  return (
    <img
      className="set-icon"
      src={`https://svgs.scryfall.io/sets/${setCode.toLowerCase()}.svg`}
      alt={setCode}
      title={setCode}
      loading="lazy"
    />
  )
}
