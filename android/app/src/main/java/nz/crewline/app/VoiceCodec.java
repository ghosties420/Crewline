package nz.crewline.app;
// G.711 mu-law, 8 kHz mono: telephone-quality voice at 64 kbit/s per speaker.
// Each 20 ms packet carries 160 compressed samples; no external codec dependency.
final class VoiceCodec {
 static byte encode(int sample){int sign=sample<0?128:0;if(sample<0)sample=-sample;sample=Math.min(sample,32635)+132;int exponent=7;for(int mask=16384;exponent>0&&(sample&mask)==0;mask>>=1)exponent--;int mantissa=(sample>>(exponent+3))&15;return (byte)~(sign|(exponent<<4)|mantissa);}
 static short decode(byte value){int u=(~value)&255;int sample=(((u&15)<<3)+132)<<((u>>4)&7);sample-=132;return (short)((u&128)!=0?-sample:sample);}
 static byte[] pack(byte[] pcm){byte[] out=new byte[pcm.length/2];for(int i=0;i<out.length;i++){short sample=(short)((pcm[i*2]&255)|(pcm[i*2+1]<<8));out[i]=encode(sample);}return out;}
 static byte[] unpack(byte[] packet,int offset){byte[] out=new byte[(packet.length-offset)*2];for(int i=offset;i<packet.length;i++){short value=decode(packet[i]);out[(i-offset)*2]=(byte)value;out[(i-offset)*2+1]=(byte)(value>>8);}return out;}
}
