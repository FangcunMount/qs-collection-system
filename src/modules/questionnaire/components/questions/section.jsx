import React from 'react'
import ShowContainer from './widget/showContainer'


const Section = (props) =>  {
  return (
    <ShowContainer title={props.item.title} tips={props.item.tips} placeholder={props.item.placeholder} index={props.index}></ShowContainer>
  )
}

export default Section