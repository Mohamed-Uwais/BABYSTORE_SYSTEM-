import test from 'node:test';
import assert from 'node:assert/strict';
import {motionPolicy,pointerDepthAllowed,depthAngles} from '../../shared/motionPolicy.mjs';
test('system reduced motion overrides every POS mode; touch and data saving disable pointer depth',()=>{
  assert.deepEqual(motionPolicy('subtle'),{reduced:false,enhanced:false});
  assert.deepEqual(motionPolicy('enhanced'),{reduced:false,enhanced:true});
  assert.deepEqual(motionPolicy('none'),{reduced:true,enhanced:false});
  for(const mode of ['subtle','enhanced','none'])assert.deepEqual(motionPolicy(mode,true),{reduced:true,enhanced:false});
  assert.equal(pointerDepthAllowed({enhanced:true,finePointer:true}),true);
  for(const state of [{enhanced:false,finePointer:true},{enhanced:true,finePointer:false},{enhanced:true,finePointer:true,saveData:true}])assert.equal(pointerDepthAllowed(state),false);
});
test('pointer perspective is bounded and safely handles zero-size surfaces',()=>{
  assert.deepEqual(depthAngles(50,50,100,100),{x:-0,y:0});
  assert.deepEqual(depthAngles(1000,-1000,100,100),{x:4,y:4});
  assert.deepEqual(depthAngles(1,1,0,0),{x:0,y:0});
});
