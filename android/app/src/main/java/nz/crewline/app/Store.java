package nz.crewline.app;
import android.content.*;
import android.database.Cursor;
import android.database.sqlite.*;
import android.location.Location;
import android.util.Base64;
import android.security.keystore.*;
import java.security.KeyStore;
import javax.crypto.*;
import javax.crypto.spec.GCMParameterSpec;
import org.json.*;

// Credentials are encrypted with an Android Keystore key; exploration never goes to the server.
final class Store extends SQLiteOpenHelper {
 static final String PREF="crewline";
 Store(Context c){super(c,"exploration.sqlite",null,1);}
 public void onCreate(SQLiteDatabase d){d.execSQL("CREATE TABLE cells(owner TEXT,x INTEGER,y INTEGER,PRIMARY KEY(owner,x,y))");}
 public void onUpgrade(SQLiteDatabase d,int a,int b){}
 static SharedPreferences prefs(Context c){return c.getSharedPreferences(PREF,Context.MODE_PRIVATE);}
 static javax.crypto.SecretKey key() throws Exception {KeyStore k=KeyStore.getInstance("AndroidKeyStore");k.load(null);if(!k.containsAlias("crewline")){KeyGenerator g=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore");g.init(new KeyGenParameterSpec.Builder("crewline",KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build());g.generateKey();}return (javax.crypto.SecretKey)k.getKey("crewline",null);}
 static void token(Context c,String value)throws Exception {if(value.isEmpty()){prefs(c).edit().remove("token").commit();return;}Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.ENCRYPT_MODE,key());String encrypted=Base64.encodeToString(cipher.getIV(),Base64.NO_WRAP)+":"+Base64.encodeToString(cipher.doFinal(value.getBytes("UTF-8")),Base64.NO_WRAP);prefs(c).edit().putString("token",encrypted).commit();}
 static String token(Context c){try{String[] s=prefs(c).getString("token","").split(":");if(s.length!=2)return "";Cipher ci=Cipher.getInstance("AES/GCM/NoPadding");ci.init(Cipher.DECRYPT_MODE,key(),new GCMParameterSpec(128,Base64.decode(s[0],Base64.NO_WRAP)));return new String(ci.doFinal(Base64.decode(s[1],Base64.NO_WRAP)),"UTF-8");}catch(Exception e){return "";}}
 static String owner(Context c){return prefs(c).getString("owner","");}
 void reveal(String owner,Location l){if(owner.isEmpty()||Math.abs(l.getLatitude())>85)return;double x=6378137*Math.toRadians(l.getLongitude()),y=6378137*Math.log(Math.tan(Math.PI/4+Math.toRadians(l.getLatitude())/2));int gx=(int)Math.floor(x/100),gy=(int)Math.floor(y/100);SQLiteDatabase d=getWritableDatabase();d.beginTransaction();try{for(int i=-1;i<=1;i++)for(int j=-1;j<=1;j++){ContentValues v=new ContentValues();v.put("owner",owner);v.put("x",gx+i);v.put("y",gy+j);d.insertWithOnConflict("cells",null,v,SQLiteDatabase.CONFLICT_IGNORE);}d.setTransactionSuccessful();}finally{d.endTransaction();}}
 JSONArray cells(String owner){JSONArray a=new JSONArray();try(Cursor c=getReadableDatabase().rawQuery("SELECT x,y FROM cells WHERE owner=?",new String[]{owner})){while(c.moveToNext()){JSONArray p=new JSONArray();p.put(c.getInt(0));p.put(c.getInt(1));a.put(p);}}return a;}
 void clear(String owner){getWritableDatabase().delete("cells","owner=?",new String[]{owner});}
}
