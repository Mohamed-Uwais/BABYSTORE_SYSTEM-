import {useEffect,useRef,useState} from 'react';
import {motion,useSpring} from 'framer-motion';
import {useStoreMotion} from './StoreMotion';
import {pointerDepthAllowed,depthAngles} from '../../../shared/motionPolicy.mjs';

// No animation loop, extra images or WebGL. Only the hovered surface updates.
export default function DepthSurface({children,className='',strength=4,...props}){
  const {enhanced,reduced}=useStoreMotion();
  const [finePointer,setFinePointer]=useState(false);
  const [saveData,setSaveData]=useState(false);
  const bounds=useRef(null);
  const rotateX=useSpring(0,{stiffness:180,damping:24});
  const rotateY=useSpring(0,{stiffness:180,damping:24});
  const enabled=pointerDepthAllowed({enhanced,finePointer,saveData});
  const reset=()=>{bounds.current=null;rotateX.set(0);rotateY.set(0);};
  useEffect(()=>{
    const query=window.matchMedia?.('(hover: hover) and (pointer: fine)');
    const update=()=>{setFinePointer(!!query?.matches);setSaveData(!!navigator.connection?.saveData);};
    update();query?.addEventListener('change',update);navigator.connection?.addEventListener?.('change',update);
    return()=>{query?.removeEventListener('change',update);navigator.connection?.removeEventListener?.('change',update);};
  },[]);
  useEffect(()=>{rotateX.set(0);rotateY.set(0);bounds.current=null;},[enabled,rotateX,rotateY]);
  return <motion.div {...props} className={`depth-surface ${className}`} data-depth={enhanced?'enhanced':'standard'}
    style={enabled?{rotateX,rotateY,transformPerspective:1100}:undefined}
    whileHover={reduced?undefined:{y:enhanced?-5:-2}} whileTap={reduced?undefined:{scale:0.99}}
    transition={{duration:0.2}}
    onPointerEnter={event=>{if(enabled&&event.pointerType==='mouse')bounds.current=event.currentTarget.getBoundingClientRect();}}
    onPointerMove={event=>{
      if(!enabled||event.pointerType!=='mouse'||!bounds.current)return;
      const rect=bounds.current;
      const angle=depthAngles(event.clientX-rect.left,event.clientY-rect.top,rect.width,rect.height,strength);
      rotateX.set(angle.x);rotateY.set(angle.y);
    }} onPointerLeave={reset} onPointerCancel={reset} onBlur={reset}>
    {children}
  </motion.div>;
}
