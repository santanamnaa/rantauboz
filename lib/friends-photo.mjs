// A photo is visible only through an active connection; never accept a peer user_id.
export const friendPhotoSql=`SELECT p.image FROM friend_connections f
 JOIN profile_photos p ON p.user_id=CASE WHEN f.low_user=$2 THEN f.high_user ELSE f.low_user END
 WHERE f.id=$1 AND f.active AND (f.low_user=$2 OR f.high_user=$2)`;
