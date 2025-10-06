import asyncio, json, sys
from reolink_aio.api import Host

# Usage:
# python get_reolink_rtsp.py <ip> <user> <pass> [channel=0] [stream=main] [rtsp_port=554]
async def main():
    if len(sys.argv) < 4:
        print(json.dumps({"error": "usage: ip user pass [channel] [main|sub] [rtsp_port]"}))
        return

    ip, user, pwd = sys.argv[1], sys.argv[2], sys.argv[3]
    channel = int(sys.argv[4]) if len(sys.argv) > 4 else 0
    stream = sys.argv[5] if len(sys.argv) > 5 else "main"
    rtsp_port_cli = int(sys.argv[6]) if len(sys.argv) > 6 else None

    host = Host(ip, user, pwd)
    await host.get_host_data()

    # Reolink RTSP path pattern:
    suffix = f"h264Preview_{channel+1:02d}_{'main' if stream=='main' else 'sub'}"
    rtsp_port = rtsp_port_cli if rtsp_port_cli else getattr(host, "rtsp_port", 554) or 554

    rtsp_url = f"rtsp://{user}:{pwd}@{ip}:{rtsp_port}/{suffix}"
    print(json.dumps({"rtsp_url": rtsp_url}))
    await host.logout()

if __name__ == "__main__":
    asyncio.run(main())
