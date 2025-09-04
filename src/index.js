const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

const beachMap = {
  "송도": 268,
  "해운대": 304,
  "송정": 305,
  "광안리": 306,
  "임랑": 307,
  "다대포": 308,
  "일광": 309
};

// ✅ Encoding Key 직접 삽입 (포털에서 받은 값, URL 인코딩 버전)
const serviceKey = "lZf40IMmpeOv3MWEUV%2BxoRC%2BzuAYiUYcDyMVbm5AVPsFZ%2BZAbhezzET3VZlh8y8dTZGsDIot0RVq0RzYgvoECA%3D%3D";

function getLatestBaseTime() {
  const hours = [2, 5, 8, 11, 14, 17, 20, 23];
  const now = new Date();
  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  let baseHour = hours[0];
  for (const h of hours) {
    if (kstNow.getHours() >= h) baseHour = h;
  }
  return String(baseHour).padStart(2, "0") + "00";
}

function getBaseDate() {
  const now = new Date();
  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kstNow.toISOString().slice(0, 10).replace(/-/g, "");
}

export default {
  async fetch(req) {
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      const url = new URL(req.url);
      const beach_name = url.searchParams.get("beach_name") || "해운대";
      const beach_num = beachMap[beach_name] || 304;

      const baseDate = getBaseDate();
      const baseTime = getLatestBaseTime();

      const endpoint = "https://apis.data.go.kr/1360000/BeachInfoservice/getVilageFcstBeach";
      const apiUrl = `${endpoint}?serviceKey=${serviceKey}&dataType=JSON&pageNo=1&numOfRows=100&base_date=${baseDate}&base_time=${baseTime}&beach_num=${beach_num}`;

      console.log("➡️ Calling KMA API:", apiUrl);

      const response = await fetch(apiUrl);
      const rawText = await response.text();
      console.log("📩 KMA raw response:", rawText);

      if (!response.ok) {
        return new Response(JSON.stringify({ error: "기상청 API 호출 실패", raw: rawText }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500
        });
      }

      let data;
      try {
        data = JSON.parse(rawText);
      } catch (e) {
        return new Response(JSON.stringify({ error: "응답 파싱 실패 (JSON 아님)", raw: rawText }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500
        });
      }

      // ✅ 요청 정보 추가
      data["request_info"] = { beach_name, beach_num, baseDate, baseTime };

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });

    } catch (error) {
      console.error("❌ Error in beach-weather-api:", error);
      return new Response(JSON.stringify({ error: "서버 오류 발생", details: String(error) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500
      });
    }
  }
};
