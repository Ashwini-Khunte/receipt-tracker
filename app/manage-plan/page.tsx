import SchematicComponents from '@/components/schematic/SchematicComponents'
import React from 'react'

const ManagePlane = () => {
  return (
    <div className='container xl:max-w-5xl mx-auto p-4 md:p-0'>
      <h1 className='text-2xl font-bold mb-4 my-8'>Manage Your Plan</h1>
      <p className='text-gtray-600 mb-8'>Manage your subscription and billing details here</p>
      <SchematicComponents 
        componentId={
          process.env.NEXT_PUBLIC_SCHEMATIC_CUSTOMER_PORTAL_COMPONENT_ID
        }
      />
    </div>
    )
}

export default ManagePlane