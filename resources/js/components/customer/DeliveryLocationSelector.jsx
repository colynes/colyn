import React from 'react';
import { MapPin } from 'lucide-react';

export default function DeliveryLocationSelector({ data, setData, errors = {}, visible = true }) {
  if (!visible) {
    return null;
  }

  return (
    <div className="space-y-5 rounded-[1.6rem] border border-[#eadfce] bg-[#fbf7f1] p-5 sm:p-6">
      <div>
        <h3 className="text-xl font-black text-[#241816]">Delivery details</h3>
        <p className="mt-2 text-sm leading-6 text-[#6f5d57]">
          Enter your delivery address manually for now. Google Maps location search has been turned off temporarily.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#241816]">Region or city</label>
          <input
            type="text"
            value={data.region_city}
            onChange={(event) => setData('region_city', event.target.value)}
            placeholder="Dar es Salaam"
            className="w-full rounded-xl border border-[#e8ddd2] bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#cdad7d]"
          />
          {errors.region_city ? <div className="mt-1 text-xs text-red-500">{errors.region_city}</div> : null}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#241816]">District or area</label>
          <input
            type="text"
            value={data.district_area}
            onChange={(event) => setData('district_area', event.target.value)}
            placeholder="Kinondoni, Mikocheni, Oysterbay"
            className="w-full rounded-xl border border-[#e8ddd2] bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#cdad7d]"
          />
          {errors.district_area ? <div className="mt-1 text-xs text-red-500">{errors.district_area}</div> : null}
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-[#241816]">Delivery address</label>
        <div className="relative">
          <MapPin className="pointer-events-none absolute left-4 top-4 h-4 w-4 text-[#8e796b]" />
          <textarea
            rows={4}
            value={data.delivery_address}
            onChange={(event) => setData('delivery_address', event.target.value)}
            placeholder="House number, street, estate, building name, or nearby location"
            className="w-full rounded-xl border border-[#e8ddd2] bg-white px-11 py-3 text-sm outline-none focus:ring-2 focus:ring-[#cdad7d] resize-none"
          />
        </div>
        {errors.delivery_address ? <div className="mt-1 text-xs text-red-500">{errors.delivery_address}</div> : null}
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-[#241816]">Delivery notes</label>
        <textarea
          rows={3}
          value={data.delivery_notes}
          onChange={(event) => setData('delivery_notes', event.target.value)}
          placeholder="Landmark, gate color, office name, or extra driver instructions"
          className="w-full rounded-xl border border-[#e8ddd2] bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#cdad7d] resize-none"
        />
        {errors.delivery_notes ? <div className="mt-1 text-xs text-red-500">{errors.delivery_notes}</div> : null}
      </div>
    </div>
  );
}
