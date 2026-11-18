import {motion,useReducedMotion} from 'framer-motion';
import {useContent} from '../context/ContentContext';
import {motionPolicy} from '../../../shared/motionPolicy.mjs';

export function useStoreMotion(){
  const systemReduced=useReducedMotion();
  const {appearance}=useContent();
  return motionPolicy(appearance?.motion,systemReduced);
}
const ease=[0.22,1,0.36,1];
export function Reveal({children,delay=0,hero=false,...props}){
  const {reduced}=useStoreMotion();
  // Stable component keys and once:true prevent data refreshes replaying reveals.
  const target={opacity:1,y:0};
  return <motion.div {...props} initial={reduced?false:{opacity:hero?1:0,y:hero?12:24}}
    {...(hero?{animate:target}:{whileInView:target,viewport:{once:true,amount:'some',margin:'0px 0px -32px 0px'}})}
    transition={reduced?{duration:0}:{duration:0.55,delay,ease}}>{children}</motion.div>;
}
export function PageTransition({children}){
  const {reduced}=useStoreMotion();
  return <motion.div initial={reduced?false:{opacity:0.65,y:10}} animate={{opacity:1,y:0}}
    exit={reduced?{}:{opacity:0.65,y:-4}} transition={{duration:reduced?0:0.2,ease}}>{children}</motion.div>;
}
export function usePanelMotion(side='right'){
  const {reduced}=useStoreMotion();
  const x=side==='left'?'-100%':side==='right'?'100%':0;
  return {initial:reduced?false:{opacity:0,x,y:side==='top'?-12:0},
    animate:{opacity:1,x:0,y:0},exit:reduced?{opacity:0}:{opacity:0,x,y:side==='top'?-12:0},
    transition:{duration:reduced?0:0.3,ease}};
}
