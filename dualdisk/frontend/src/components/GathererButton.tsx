import gathererIcon from '../assets/gatherer-icon.png'

export function GathererButton({ url }: { url: string | null }) {
  if (!url) return null
  return (
    <a className="gatherer-btn" href={url} target="_blank" rel="noreferrer" title="View on Gatherer">
      <img src={gathererIcon} alt="Gatherer" />
    </a>
  )
}
