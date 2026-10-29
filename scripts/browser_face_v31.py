"""Bounded, read-only observations on the existing station input route.

The app-module probe calls the production face helpers with the same actual
character/presented-soul objects used by rendering. This module never starts a
chapter, updates a game, changes a save/clock, or synthesizes a gameplay input.
Only GitHub Actions runs the real browser; offline tests are evidence validators.
"""
import base64
import json
import math
import time
from pathlib import Path


FACE_FRAME_OBSERVER = """config=>{
  if(window.__qaFaceFrames)throw Error('face observer already installed');
  if(!['ticket','lamp','fatigue'].includes(config.kind))throw Error('unknown face observation');
  const startedAt=performance.now(),limitMs={ticket:16000,lamp:5000,fatigue:27000}[config.kind];
  const ring=[],events=[],latches={},images={},violations=[];
  let active=true,raf=0,timer=0,frames=0,sequence=0,last=null,eventSeen=false,reason=null;
  const fail=message=>{if(violations.length<8)violations.push(message);};
  const pick=(a,source)=>({
    sequence:sequence++,source,observedAt:performance.now(),viewport:{width:innerWidth,height:innerHeight},
    form:a.form,state:a.state,chapterIndex:a.chapterIndex,mode:a.mode,festivalId:a.festivalId,
    runId:a.runId,bodyIdentity:a.bodyIdentity,input:a.input,energy:a.energy,maxEnergy:a.maxEnergy,
    emoteTime:a.emoteTime,seals:a.seals,memories:a.memories,lampFlags:a.lampFlags,memoryFlags:a.memoryFlags,
    firstTicket:a.firstTicket,time:a.time,visualTime:a.visualTime,deaths:a.deaths,reducedMotion:a.reducedMotion,
    body:a.body,capPhase:a.capPhase,capAge:a.capAge,capAmount:a.capAmount,
    facePresentation:a.facePresentation,characterPose:a.characterPose
  });
  const initial=pick(window.__qaRead(),'installation');last=initial;
  function latch(name,s,paint=false){
    if(latches[name])return;
    latches[name]=s;
    if(paint){
      const canvas=document.querySelector('#dream-canvas'),box=canvas?.getBoundingClientRect();
      if(!canvas||!box||!canvas.width||!canvas.height){fail('actual Canvas unavailable for '+name);return;}
      try{images[name]={sequence:s.sequence,viewport:s.viewport,width:canvas.width,height:canvas.height,
        css:{left:box.left,top:box.top,width:box.width,height:box.height},
        source:'unmodified current Canvas pixels; one RAF observation, no render call',png:canvas.toDataURL('image/png')};}
      catch(error){fail('Canvas capture '+name+': '+String(error));}
    }
  }
  function observe(s,paint){
    for(const key of ['runId','bodyIdentity','chapterIndex','mode','deaths','reducedMotion'])
      if(s[key]!==initial[key])fail('changed '+key);
    if(s.time<last.time-1e-8||s.visualTime<last.visualTime-1e-8)fail('game clock moved backwards');
    const memoryChanged=JSON.stringify(s.memoryFlags)!==JSON.stringify(last.memoryFlags);
    const lampChanged=JSON.stringify(s.lampFlags)!==JSON.stringify(last.lampFlags);
    const expectedEvent=config.kind==='ticket'&&!last.memoryFlags[0]&&s.memoryFlags[0]&&s.memories===1&&s.seals===0
      ||config.kind==='lamp'&&!last.lampFlags[0]&&s.lampFlags[0]&&s.seals===1&&s.memories===initial.memories;
    if(memoryChanged||lampChanged){
      if(eventSeen||!expectedEvent)fail('unexpected collection/light change');
      else{latches.event={before:last,after:s};eventSeen=true;}
    }else if(Math.abs(s.emoteTime-Math.max(0,last.emoteTime-(s.time-last.time)))>1e-6)
      fail('event duration was refreshed without its actual collection/light');
    const face=s.facePresentation,shown=face?.presentedSoul;
    if(paint){
      const soulEyelid=1-.84*Math.max(0,Math.min(1,(Math.sin(face.time*1.42+1)-.975)/.025));
      if(eventSeen&&s.form==='soul'&&shown?.pose==='free'&&shown.layer==='world'&&face.soulJoy&&soulEyelid>.3)
        latch('freeJoy',s,true);
      if(s.form==='body'&&s.capPhase==='returning'&&shown?.pose==='return'&&shown.layer==='inside')
        latch('returning',s);
      if(eventSeen&&s.form==='body'&&s.capPhase==='closed'&&face?.body?.kind==='joy'&&face.body.blink>.2)
        latch('closedJoy',s,true);
      if(config.kind==='fatigue'){
        if(s.form==='soul'&&s.capPhase==='open'&&s.energy<=23&&s.energy>=20&&s.emoteTime===0)
          latch('soulTired',s,true);
        if(s.form==='soul'&&s.capPhase==='open'&&s.energy<20&&s.emoteTime===0&&face?.body?.blink>.2){
          if(s.observedAt-startedAt<=21000)latch('bodyTiredOpen',s,true);
          if(latches.bodyTiredOpen&&[390,320].includes(s.viewport.width))
            latch('bodyTiredOpen-'+s.viewport.width,s,true);
        }
        if(s.form==='body'&&s.capPhase==='closed'&&s.energy>=20&&s.emoteTime===0)
          latch('recovered',s,true);
      }
    }
    last=s;ring.push(s);if(ring.length>96)ring.shift();
  }
  function native(event){
    const target=event.target?.closest?.('#stage-toggle,#puzzle-continue');
    const key=event.type==='keydown'&&event.code==='KeyE';
    if(!target&&!key)return;
    if(events.length>=32){fail('native event record bound exceeded');return;}
    const snapshot=pick(window.__qaRead(),'native-capture');observe(snapshot,false);
    events.push({type:event.type,code:event.code||null,targetId:target?.id||event.target?.id||null,
      action:key||event.type==='click'&&target?.id==='stage-toggle'?'toggle':event.type==='click'&&target?.id==='puzzle-continue'?'continue':null,
      isTrusted:event.isTrusted===true,repeat:event.repeat===true,pointerType:event.pointerType||null,
      pointerId:Number.isFinite(event.pointerId)?event.pointerId:null,detail:event.detail??null,
      observedAt:snapshot.observedAt,sequence:snapshot.sequence,snapshot});
  }
  const types=['keydown','pointerdown','pointerup','click'];
  function stop(why='cleanup'){
    if(active){active=false;reason=why;cancelAnimationFrame(raf);clearTimeout(timer);
      for(const type of types)window.removeEventListener(type,native,true);}
    return read();
  }
  function read(){return {kind:config.kind,startedAt,limitMs,depletionBudgetMs:config.kind==='fatigue'?21000:null,
    active,reason,frames,initial,last,events:[...events],samples:[...ring],latches:{...latches},images:{...images},
    violations:[...violations],bounds:{samples:96,events:32,violations:8},observedAt:performance.now()};}
  function tick(){
    if(!active)return;
    try{frames++;observe(pick(window.__qaRead(),'raf'),true);}
    catch(error){fail(String(error));stop('observer-error');return;}
    if(performance.now()-startedAt>=limitMs){fail('bounded observer expired');stop('expired');return;}
    raf=requestAnimationFrame(tick);
  }
  for(const type of types)window.addEventListener(type,native,true);
  timer=setTimeout(()=>{fail('bounded observer expired');stop('expired');},limitMs);
  window.__qaFaceFrames={read,stop};raf=requestAnimationFrame(tick);
  return read();
}"""


def _close(actual, expected, message, tolerance=1e-6):
    assert isinstance(actual, (int, float)) and not isinstance(actual, bool) and math.isfinite(actual), message+' is not finite'
    assert abs(actual-expected)<=tolerance, message+' differs from actual engine facts'


def _clamp(value, low, high):
    return max(low, min(high, value))


def validate_face_snapshot(s):
    """Check production-derived views against raw energy, clocks and actual rig.

    In particular, return gaze must use the presented cubic path, not raw soul
    coordinates or a reconstructed body position. No expected face is fed back.
    """
    p=s['facePresentation'];face=p['body'];shown=p['presentedSoul']
    eligible=s['mode']=='story' and type(s['chapterIndex']) is int and 0<=s['chapterIndex']<6
    if not eligible:
        assert face is None and p['soulJoy'] is False, 'face refinement leaked outside six story chapters'
        return {'eligible':False,'body':None,'soulJoy':False}
    assert isinstance(face,dict), 'eligible story face is missing'
    assert all(type(flag) is bool for flag in s['memoryFlags']+s['lampFlags']), 'collection flags are not actual booleans'
    assert s['memories']==sum(s['memoryFlags']) and s['seals']==sum(s['lampFlags']), 'collection totals contradict the real items'
    t=0 if s['reducedMotion'] else s['visualTime']
    _close(p['time'],t,'face clock')
    energy=s['energy'];emote=s['emoteTime'];body=s['body'];cap=s['capPhase']
    for key,value in [('energy',energy),('emoteTime',emote),('capAge',s['capAge']),('capAmount',s['capAmount'])]:
        _close(value,value,key)
    assert 0<=energy<=s['maxEnergy'] and emote>=0, 'invalid actual energy/event duration'
    opening=cap=='opening';attentive=s['form']=='soul' or cap=='returning'
    sleepy=energy<20;happy=emote>0
    expected='tired' if sleepy else 'attentive' if attentive or opening else 'joy' if happy else 'neutral'
    assert face['kind']==expected, 'face kind ignored fatigue, attention or actual event time'
    for key,value in [('sleepy',sleepy),('happy',happy),('opening',opening),('attentive',attentive)]:
        assert face[key] is value, 'incorrect face flag '+key
    blink=.12 if math.sin(t*1.27+.4)>.985 else .43 if sleepy else 1.06 if opening else .7 if happy else 1
    _close(face['blink'],blink,'original blink')
    raw=p['rawSoul'];anchor=s['characterPose']['openingWorld']
    if s['form']=='soul':
        assert shown is not None, 'actual soul presentation missing'
        q=p['capEntry'] if opening else 1
        assert 0<=q<=1, 'actual cap entry is outside its presentation range'
        for axis in ['x','y']:_close(shown[axis],anchor[axis]+(raw[axis]-anchor[axis])*q,'presented soul '+axis)
        for axis in ['vx','vy']:_close(shown[axis],raw[axis],'presented velocity '+axis)
        _close(shown['scale'],.36+.64*q,'presented soul scale')
        _close(shown['alpha'],_clamp(s['capAmount']*3,0,1),'presented soul alpha')
        assert shown['pose']==('peek' if q<1 else 'free') and shown['layer']==('inside' if q<1 else 'world'), 'peek/free layer mismatch'
    elif cap=='returning' and p['returnFrom'] is not None and not s['reducedMotion'] and s['capAge']<.48:
        assert shown is not None and shown['pose']=='return' and shown['layer']=='inside', 'return presentation was replaced by a free soul'
        progress=_clamp(s['capAge']/.48,0,1);q=progress*progress*(3-2*progress);u=1-q
        start=p['returnFrom'];lift=min(135,28+math.hypot(anchor['x']-start['x'],anchor['y']-start['y'])*.17)
        _close(shown['x'],u**3*start['x']+3*u*u*q*(start['x']+(anchor['x']-start['x'])*.3)+3*u*q*q*(anchor['x']-body['face']*33)+q**3*anchor['x'],'actual return path x')
        _close(shown['y'],u**3*start['y']+3*u*u*q*(start['y']-lift)+3*u*q*q*(anchor['y']-52)+q**3*anchor['y'],'actual return path y')
        _close(shown['scale'],start['scale']*(1-q*.68),'return scale')
        _close(shown['alpha'],start['alpha']*_clamp((1-progress)/.13,0,1),'return alpha')
        _close(shown['vx'],_clamp((anchor['x']-start['x'])*1.3,-340,340),'return velocity x')
        _close(shown['vy'],0,'return velocity y')
    else:assert shown is None, 'closed/stowed soul was still presented'
    look_x=_clamp(((shown['x'] if shown else body['x'])-body['x'])*body['face']/100,-3,3) if attentive else _clamp(body['vx']*body['face']/180,-1.3,1.3)+.35
    _close(face['lookX'],look_x,'gaze from the actual shown soul')
    _close(face['lookY'],-2.7 if attentive else 1.8 if sleepy else -.7,'vertical gaze')
    soul_joy=happy and energy>=25 and shown is not None and shown['pose']=='free' and shown['layer']=='world'
    assert p['soulJoy'] is soul_joy, 'free-soul joy ignored event, energy, pose or layer'
    return {'eligible':True,'body':expected,'soulJoy':soul_joy,'capPhase':cap,'energy':energy,'emoteTime':emote}


def validate_face_record(record, required=()):
    """Reject late installation, expired joy, stale bodies and false low-energy claims."""
    assert not record['violations'], 'face observer violated continuity: '+str(record['violations'])
    assert record['reason'] not in ['expired','observer-error'], 'face observation did not finish within its bound'
    initial=record['initial'];kind=record['kind'];latches=record['latches']
    assert type(initial['bodyIdentity']) is int and initial['bodyIdentity']>0 and type(initial['runId']) is int and initial['runId']>0, 'missing real run/body identity'
    assert initial['mode']=='story' and initial['chapterIndex']==0 and initial['deaths']==0, 'face event must use the normal safe station run'
    assert initial['reducedMotion'] is False, 'this route must observe the actual return animation'
    assert initial['source']=='installation', 'missing pre-input installation evidence'
    if kind=='ticket':
        assert initial['form']=='body' and initial['capPhase']=='closed' and initial['memories']==0 and initial['seals']==0 and initial['emoteTime']==0, 'ticket observer installed after its real event'
    elif kind=='lamp':
        assert initial['state']=='paused' and initial['form']=='soul' and initial['seals']==0 and not initial['lampFlags'][0] and initial['emoteTime']==0, 'lamp observer must precede the real continue click'
    else:
        assert kind=='fatigue' and initial['form']=='soul' and initial['capPhase']=='open' and initial['energy']>23, 'depletion must start before either low-energy threshold'
        assert record['depletionBudgetMs']==21000, 'natural depletion budget was extended'
    samples=[initial,record['last'],*record['samples'],*(e['snapshot'] for e in record['events'])]
    for name,s in latches.items():samples.extend([s['before'],s['after']] if name=='event' else [s])
    for s in samples:
        validate_face_snapshot(s)
        for key in ['runId','bodyIdentity','chapterIndex','mode','deaths','reducedMotion']:
            assert s[key]==initial[key], 'face evidence changed '+key
        assert s['time']>=initial['time'] and s['observedAt']>=record['startedAt'], 'face evidence predates observation'
    assert len(record['samples'])<=96 and len(record['events'])<=32, 'unbounded observation record'
    actions=[e for e in record['events'] if e['action']]
    assert all(e['isTrusted'] and not e['repeat'] for e in actions), 'face route was not driven by fresh real input'
    assert all(e['observedAt']>=initial['observedAt'] for e in actions), 'observer installed after input'
    if kind in ['ticket','lamp']:
        assert 'event' in latches, 'missing actual collection/light transition'
        event=latches['event'];before=event['before'];after=event['after'];duration=2.3 if kind=='ticket' else 2
        assert 0<after['emoteTime']<=duration and before['sequence']<after['sequence'], 'not a fresh real collection/light event'
        if kind=='ticket':
            assert before['memories']==0 and after['memories']==1 and not before['memoryFlags'][0] and after['memoryFlags'][0], 'ticket count did not really change'
            assert after['firstTicket']['phase']=='held' and after['seals']==0, 'ticket event was substituted'
        else:
            assert before['seals']==0 and after['seals']==1 and not before['lampFlags'][0] and after['lampFlags'][0], 'first lamp did not really light'
            assert after['memories']==initial['memories'], 'lamp event substituted another memory'
        triggering='toggle' if kind=='ticket' else 'continue'
        assert any(e['action']==triggering and e['sequence']<after['sequence'] for e in actions), 'event lacked its preceding real input'
        for name in ['freeJoy','closedJoy']:
            if name not in latches:continue
            s=latches[name]
            assert s['sequence']>=after['sequence'] and s['time']>=after['time'], 'joy predates its collection/light'
            _close(s['emoteTime'],max(0,after['emoteTime']-(s['time']-after['time'])),'remaining original event time')
            assert s['emoteTime']>0, 'expired event was reused for joy'
    for name in required:assert name in latches, 'missing actual face stage '+name
    for name,s in latches.items():
        if name=='event':continue
        assert s['source']=='raf', 'a face frame was replaced by an input-capture snapshot'
        if name=='freeJoy':
            assert s['form']=='soul' and s['facePresentation']['soulJoy'] is True and s['facePresentation']['body']['kind']=='attentive', 'free success expression was not observed'
            eyelid=1-.84*_clamp((math.sin(s['facePresentation']['time']*1.42+1)-.975)/.025,0,1)
            assert eyelid>.3, 'soul joy screenshot caught only the original blink'
        elif name=='returning':
            assert s['form']=='body' and s['capPhase']=='returning' and s['facePresentation']['presentedSoul']['pose']=='return' and s['facePresentation']['soulJoy'] is False, 'returning soul was relabelled as free joy'
            assert any(e['action']=='toggle' and e['snapshot']['form']=='soul' and e['sequence']<s['sequence'] for e in actions), 'return did not follow the original E/touch input'
        elif name=='closedJoy':
            assert s['form']=='body' and s['capPhase']=='closed' and s['facePresentation']['body']['kind']=='joy' and s['facePresentation']['body']['blink']>.2, 'closed-lid smile was not actually visible'
            assert s['firstTicket']['phase']=='stowed', 'closed success frame kept the ticket outside'
        elif name=='soulTired':
            assert 20<=s['energy']<=23 and s['form']=='soul' and s['capPhase']=='open' and s['emoteTime']==0 and s['facePresentation']['body']['kind']=='attentive' and s['facePresentation']['soulJoy'] is False, '23-energy soul tiredness was confused with <20 body fatigue'
        elif name.startswith('bodyTiredOpen'):
            assert s['form']=='soul' and s['capPhase']=='open' and s['energy']<20 and s['emoteTime']==0 and s['facePresentation']['body']['kind']=='tired' and s['facePresentation']['body']['blink']>.2, 'open-lid body fatigue was not really observed'
            if name=='bodyTiredOpen':assert s['observedAt']-record['startedAt']<=21000, 'body fatigue exceeded the original total window'
            else:assert s['viewport']['width']==int(name.split('-')[-1]), 'fatigue phone frame has the wrong viewport'
        elif name=='recovered':
            assert s['form']=='body' and s['capPhase']=='closed' and s['energy']>=20 and s['emoteTime']==0 and s['facePresentation']['body']['kind']=='neutral', 'recovery relabelled fatigue as an old success'
    for name in required:
        if name in ['event','returning']:continue
        image=record['images'].get(name);s=latches[name]
        assert image and image['sequence']==s['sequence'] and image['viewport']==s['viewport'], 'missing/mismatched original Canvas frame '+name
        assert image['width']>0 and image['height']>0 and image['png'].startswith('data:image/png;base64,'), 'invalid original Canvas capture '+name
    expected_actions=['toggle'] if kind=='ticket' else ['continue'] if kind=='lamp' else []
    if 'returning' in required or 'closedJoy' in required or 'recovered' in required:expected_actions+=['toggle']
    assert [e['action'] for e in actions]==expected_actions, 'added, missing or repeated face-route input'
    return {'kind':kind,'requiredObserved':list(required),'sameRunAndBody':True,'originalEventTime':kind!='fatigue',
            'inputActions':expected_actions,'bodyFatigueScope':'open lid, form soul; no closed-lid fatigue claim' if kind=='fatigue' else None,
            'browserScope':'real Chromium only when this driver completes in Actions; not a physical phone or Safari/GPU claim'}


class FaceSequence:
    """Switch finite observations at existing driver boundaries, with evidence on failure."""
    def __init__(self,page,output,label):
        self.page=page;self.output=Path(output);self.label=label;self.kind=None
        self.records=[];self.last_record=None;self.deadline=None

    async def __aenter__(self):return self

    async def start(self,kind):
        assert self.kind is None, 'previous face stage was not cleaned up'
        self.kind=kind;self.deadline=time.monotonic()+21 if kind=='fatigue' else None
        self.last_record=None
        self.last_record=await self.page.evaluate(FACE_FRAME_OBSERVER,{'kind':kind})

    async def _read(self,stop=False):
        self.last_record=await self.page.evaluate("""stop=>{
          const observer=window.__qaFaceFrames;if(!observer)throw Error('face observer missing');
          const record=stop?observer.stop('cleanup'):observer.read();
          if(stop)delete window.__qaFaceFrames;
          return {...record,cleanup:{requested:stop,stopped:!record.active,removed:!window.__qaFaceFrames}};
        }""",stop)
        return self.last_record

    def _write(self,phase,record,error=None,validation=None):
        self.output.mkdir(parents=True,exist_ok=True)
        written=json.loads(json.dumps(record)) if record is not None else {'kind':self.kind,'evidenceUnavailable':True}
        written.update({'label':self.label,'phase':phase,'status':'failed' if error else 'passed',
                        'error':error,'validation':validation,'scope':'read-only on existing normal input; original Canvas exports are not newly rendered fixtures'})
        for name,image in written.get('images',{}).items():
            encoded=image.pop('png',None)
            if encoded is not None:
                assert encoded.startswith('data:image/png;base64,'), 'Canvas did not yield PNG pixels'
                pixels=base64.b64decode(encoded.split(',',1)[1],validate=True)
                assert pixels.startswith(b'\x89PNG\r\n\x1a\n'), 'invalid original Canvas PNG'
                filename=self.label+'-face-'+str(self.kind)+'-'+name+'.png'
                (self.output/filename).write_bytes(pixels);image['file']=filename
        filename=self.label+'-face-'+str(self.kind)+'-'+phase+'.json'
        (self.output/filename).write_text(json.dumps(written,ensure_ascii=False,indent=2)+'\n')
        return {'kind':self.kind,'phase':phase,'file':filename,'validation':validation}

    async def checkpoint(self,phase,required=(),finish=False):
        try:
            record=await self._read(stop=finish)
            validation=validate_face_record(record,required)
            if finish:assert record['cleanup']=={'requested':True,'stopped':True,'removed':True}, 'face observer cleanup incomplete'
            summary=self._write(phase,record,validation=validation);self.records.append(summary)
            if finish:self.kind=None
            return summary
        except BaseException as error:
            await self._failure(phase,error)
            raise

    async def _failure(self,phase,error):
        if self.kind is None:return
        record=self.last_record
        try:
            exists=await self.page.evaluate("!!window.__qaFaceFrames")
            if exists:record=await self._read(stop=True)
        except BaseException as cleanup_error:
            record=dict(record or {});record['cleanupError']=str(cleanup_error)
        self._write(phase,record,error=repr(error))
        try:
            screenshot=self.label+'-face-'+self.kind+'-'+phase+'-failure.png'
            await self.page.screenshot(path=str(self.output/screenshot),full_page=True)
            if record is not None:record['failureScreenshot']=screenshot
        except BaseException as screenshot_error:
            if record is not None:record['failureScreenshotError']=str(screenshot_error)
        self._write(phase,record,error=repr(error));self.kind=None

    async def __aexit__(self,error_type,error,traceback):
        if self.kind is not None:
            await self._failure('interrupted',error or AssertionError('face stage exited without its required checkpoint'))
            if error is None:raise AssertionError('face stage exited without its required checkpoint')
        return False


async def wait_for_natural_fatigue(page,sequence):
    """Keep the original <=23 gate and share its ONE 21-second total deadline."""
    assert sequence.kind=='fatigue' and sequence.deadline is not None
    def remaining():
        milliseconds=math.floor((sequence.deadline-time.monotonic())*1000)
        assert milliseconds>0, 'original 21-second natural depletion window elapsed'
        return min(21000,milliseconds)
    await page.wait_for_function("()=>{const a=window.__qaRead();return a?.form==='soul'&&a.energy<=23;}",timeout=remaining())
    await sequence.checkpoint('soul-low-energy',required=['soulTired'])
    await page.wait_for_function("()=>!!window.__qaFaceFrames?.read().latches.bodyTiredOpen",timeout=remaining())
    assert time.monotonic()<=sequence.deadline, 'body fatigue arrived after the original total deadline'
    await sequence.checkpoint('body-tired-open',required=['soulTired','bodyTiredOpen'])
