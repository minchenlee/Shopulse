export default function NavButton(props){
  const text = props.text
  const onclick = props.onclick
  const className = props.className

  return(
    <button 
    onClick={onclick}
    className={`w-auto text-start text-lg text-grey font-russoOne hover:text-primary duration-300 ease-in-out text-nowrap ${className}`}>
      {text}
    </button>
  )
}
